const admin = require('../services/firebase');
const path = require('path');

exports.createRequest = async (req, res) => {
    try {
        const { title, description, machineId, priority, createdBy } = req.body;
        const file = req.file;

        const photoUrl = file
            ? `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
            : null;

        const requestData = {
            title,
            description,
            machineId,
            priority,
            photoUrl,
            createdBy, // Captured from frontend
            status: 'Pending',
            createdAt: new Date(),
            participants: [createdBy], // Add creator to participants array
        };

        const docRef = await admin.firestore().collection('requests').add(requestData);

        res.status(201).json({ id: docRef.id, ...requestData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create request' });
    }
};

// This function fetches dashboard statistics like total requests, pending, in-progress, and done counts.
exports.getDashboardStats = async (req, res) => {
    try {
        const db = admin.firestore();
        const requestsSnapshot = await db.collection('requests').get();
        const totalRequests = requestsSnapshot.size;

        // Example: count by status
        let pending = 0, inProgress = 0, done = 0;
        requestsSnapshot.forEach(doc => {
            const status = doc.data().status;
            if (status === 'Pending') pending++;
            else if (status === 'In Progress') inProgress++;
            else if (status === 'Done') done++;
        });

        res.json({
            totalRequests,
            pending,
            inProgress,
            done,
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
};

// Assign a task to a technician (admin only)
exports.assignTask = async (req, res) => {
    try {
        const { taskId, technicianId, assignedBy } = req.body;
        if (!taskId || !technicianId || !assignedBy) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        const db = admin.firestore();
        // Fetch the user assigning the task
        const adminSnap = await db.collection('users').doc(assignedBy).get();
        if (!adminSnap.exists) {
            return res.status(404).json({ message: 'Assigning user not found' });
        }
        const adminData = adminSnap.data();
        if (adminData.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can assign tasks' });
        }
        // Optionally, check if technician exists and is active
        const techSnap = await db.collection('users').doc(technicianId).get();
        if (!techSnap.exists || techSnap.data().is_active === false) {
            return res.status(404).json({ message: 'Technician not found or inactive' });
        }
        // Update the request with assignment info
        await db.collection('requests').doc(taskId).update({
            assignedTo: technicianId,
            assignedBy: assignedBy
        });
        res.json({ message: 'Task assigned successfully' });
    } catch (err) {
        console.error('Error assigning task:', err);
        res.status(500).json({ message: 'Failed to assign task' });
    }
};

// Get a single request by ID with access control
exports.getRequestById = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, role } = req.query;
        const db = admin.firestore();
        const doc = await db.collection('requests').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const data = doc.data();
        // Only allow access if user is creator, assigned technician, admin, or lead
        if (
            data.createdBy !== userId &&
            data.assignedTo !== userId &&
            role !== 'admin' &&
            role !== 'lead'
        ) {
            return res.status(403).json({ message: 'Not authorized to view this request' });
        }
        res.json({ id: doc.id, ...data });
    } catch (err) {
        console.error('Error fetching request:', err);
        res.status(500).json({ message: 'Failed to fetch request' });
    }
};

// PATCH: Update request status (including technician actions)
exports.updateRequestStatus = async (req, res) => {
    try {
        let { status, userId, role } = req.body;
        const id = req.params.id;
        const db = admin.firestore();
        const docRef = db.collection('requests').doc(id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const data = docSnap.data();
        // Only allow update if user is creator, assigned technician, admin, or lead
        if (
            data.createdBy !== userId &&
            data.assignedTo !== userId &&
            role !== 'admin' &&
            role !== 'lead'
        ) {
            return res.status(403).json({ message: 'Not authorized to update this request' });
        }
        // Harmonize status mapping
        function mapStatus(s) {
            if (!s) return 'Pending';
            const val = s.toLowerCase();
            if (["pending", "not started"].includes(val)) return "Pending";
            if (["in progress"].includes(val)) return "In Progress";
            if (["resolved", "done", "completed", "not able to fix"].includes(val)) return "Done";
            return "Pending";
        }
        status = mapStatus(status);
        await docRef.update({ status });
        res.status(200).json({ message: 'Status updated', id });
    } catch (err) {
        console.error('Failed to update status:', err);
        res.status(500).json({ message: 'Update failed' });
    }
};

// PATCH: User approval of technician result
exports.updateUserApproval = async (req, res) => {
    try {
        const { approval, userId } = req.body; // approval: 'approved' | 'rejected'
        const id = req.params.id;
        const db = admin.firestore();
        const docRef = db.collection('requests').doc(id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const data = docSnap.data();
        if (data.createdBy !== userId) {
            return res.status(403).json({ message: 'Only the request creator can approve/reject' });
        }
        if (!['approved', 'rejected'].includes(approval)) {
            return res.status(400).json({ message: 'Invalid approval value' });
        }
        await docRef.update({ userApproval: approval });
        res.status(200).json({ message: 'User approval updated', id });
    } catch (err) {
        console.error('Failed to update user approval:', err);
        res.status(500).json({ message: 'Approval update failed' });
    }
};

// PATCH: Technician proposes a resolution (pending approval)
exports.proposeResolution = async (req, res) => {
    try {
        const { status, userId } = req.body; // status: 'Resolved' | 'Not Able to Fix'
        const id = req.params.id;
        const db = admin.firestore();
        const docRef = db.collection('requests').doc(id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const data = docSnap.data();
        if (data.assignedTo !== userId) {
            return res.status(403).json({ message: 'Only the assigned technician can propose a resolution' });
        }
        if (!['Resolved', 'Not Able to Fix'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }
        await docRef.update({
            pendingResolution: {
                status,
                by: userId,
                at: new Date(),
            },
            userApproval: 'pending',
        });
        res.status(200).json({ message: 'Resolution proposed, pending approval', id });
    } catch (err) {
        console.error('Failed to propose resolution:', err);
        res.status(500).json({ message: 'Proposal failed' });
    }
};

// PATCH: Approve or reject a pending resolution
exports.approveResolution = async (req, res) => {
    try {
        const { approval, userId, role } = req.body; // approval: 'approved' | 'rejected'
        const id = req.params.id;
        const db = admin.firestore();
        const docRef = db.collection('requests').doc(id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const data = docSnap.data();
        // Only creator or admin can approve/reject
        if (data.createdBy !== userId && role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to approve/reject' });
        }
        if (!data.pendingResolution) {
            return res.status(400).json({ message: 'No pending resolution to approve/reject' });
        }
        if (!['approved', 'rejected'].includes(approval)) {
            return res.status(400).json({ message: 'Invalid approval value' });
        }
        if (approval === 'approved') {
            await docRef.update({
                status: data.pendingResolution.status,
                userApproval: 'approved',
                pendingResolution: admin.firestore.FieldValue.delete(),
            });
        } else {
            await docRef.update({
                userApproval: 'rejected',
                pendingResolution: admin.firestore.FieldValue.delete(),
            });
        }
        res.status(200).json({ message: 'Resolution approval updated', id });
    } catch (err) {
        console.error('Failed to update approval:', err);
        res.status(500).json({ message: 'Approval update failed' });
    }
};

// Delete a request by ID
exports.deleteRequest = async (req, res) => {
    try {
        const { id } = req.params;
        await admin.firestore().collection('requests').doc(id).delete();
        res.status(200).json({ message: 'Request deleted successfully' });
    } catch (err) {
        console.error('Error deleting request:', err);
        res.status(500).json({ message: 'Failed to delete request' });
    }
};

// Update a request by ID
exports.updateRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        await admin.firestore().collection('requests').doc(id).update(updateData);
        res.status(200).json({ message: 'Request updated successfully' });
    } catch (err) {
        console.error('Error updating request:', err);
        res.status(500).json({ message: 'Failed to update request' });
    }
};
