const admin = require('../services/firebase');
const path = require('path');
const db = admin.database();
const { canPerform } = require('../permissions/permissions');

exports.createRequest = async (req, res) => {
    try {
        const { title, description, machineId, priority } = req.body;
        const createdBy = req.user.uid;
        // Permission already checked by middleware
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
            createdBy,
            status: 'Pending',
            createdAt: new Date().toISOString(),
            participants: [createdBy],
        };

        const newRequestRef = db.ref('requests').push();
        await newRequestRef.set(requestData);

        res.status(201).json({ id: newRequestRef.key, ...requestData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create request' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const requestsSnap = await db.ref('requests').once('value');
        const requests = requestsSnap.val() || {};
        const totalRequests = Object.keys(requests).length;

        let pending = 0, inProgress = 0, done = 0;
        Object.values(requests).forEach(r => {
            const status = r.status;
            if (status === 'Pending') pending++;
            else if (status === 'In Progress') inProgress++;
            else if (status === 'Done') done++;
        });

        res.json({ totalRequests, pending, inProgress, done });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
};

exports.assignTask = async (req, res) => {
    try {
        const { taskId, technicianId, assignedBy } = req.body;
        if (!taskId || !technicianId || !assignedBy) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // Validate assigning user
        const adminSnap = await db.ref(`users/${assignedBy}`).once('value');
        if (!adminSnap.exists()) {
            return res.status(404).json({ message: 'Assigning user not found' });
        }
        const adminData = adminSnap.val();
        const user = { uid: assignedBy, role: adminData.role };
        if (!canPerform(user, 'assignTask')) {
            return res.status(403).json({ message: 'Not authorized to assign tasks' });
        }
        // Validate technician
        const techSnap = await db.ref(`users/${technicianId}`).once('value');
        if (!techSnap.exists() || techSnap.val().is_active === false) {
            return res.status(404).json({ message: 'Technician not found or inactive' });
        }
        // Update the request
        const requestRef = db.ref(`requests/${taskId}`);
        const requestSnap = await requestRef.once('value');
        if (!requestSnap.exists()) {
            return res.status(404).json({ message: 'Request not found' });
        }
        let requestData = requestSnap.val();
        let participants = requestData.participants || [];
        if (!participants.includes(technicianId)) participants.push(technicianId);
        if (!participants.includes(requestData.createdBy)) participants.push(requestData.createdBy);
        await requestRef.update({
            assignedTo: technicianId,
            assignedBy: assignedBy,
            participants
        });
        res.json({ message: 'Task assigned successfully' });
    } catch (err) {
        console.error('Error assigning task:', err);
        res.status(500).json({ message: 'Failed to assign task' });
    }
};

exports.getRequestById = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, role } = req.query;
        const docSnap = await db.ref(`requests/${id}`).once('value');
        if (!docSnap.exists()) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const data = docSnap.val();
        const user = { uid: userId, role };
        if (!canPerform(user, 'viewRequest', data)) {
            return res.status(403).json({ message: 'Not authorized to view this request' });
        }
        res.json({ id, ...data });
    } catch (err) {
        console.error('Error fetching request:', err);
        res.status(500).json({ message: 'Failed to fetch request' });
    }
};
exports.updateRequestStatus = async (req, res) => {
    try {
        let { status, userId, role } = req.body;
        const id = req.params.id;
        const docRef = db.ref(`requests/${id}`);
        const docSnap = await docRef.once('value');
        if (!docSnap.exists()) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const data = docSnap.val();
        const user = { uid: userId, role };
        if (!canPerform(user, 'updateRequest', data)) {
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
        await docRef.update({ status: mapStatus(status) });
        res.json({ message: 'Status updated' });
    } catch (err) {
        console.error('Error updating request status:', err);
        res.status(500).json({ message: 'Failed to update request status' });
    }
};

// PATCH: User approval of technician result
exports.updateUserApproval = async (req, res) => {
    try {
        const { approval, userId } = req.body; // approval: 'approved' | 'rejected'
        const id = req.params.id;
        const requestRef = db.ref(`requests/${id}`);
        const requestSnap = await requestRef.once('value');
        if (!requestSnap.exists()) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const data = requestSnap.val();
        if (data.createdBy !== userId) {
            return res.status(403).json({ message: 'Only the request creator can approve/reject' });
        }
        if (!['approved', 'rejected'].includes(approval)) {
            return res.status(400).json({ message: 'Invalid approval value' });
        }
        await requestRef.update({ userApproval: approval });
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
        const requestRef = db.ref(`requests/${id}`);
        const requestSnap = await requestRef.once('value');
        if (!requestSnap.exists()) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const data = requestSnap.val();
        if (data.assignedTo !== userId) {
            return res.status(403).json({ message: 'Only the assigned technician can propose a resolution' });
        }
        if (!['Resolved', 'Not Able to Fix'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }
        await requestRef.update({
            pendingResolution: {
                status,
                by: userId,
                at: new Date().toISOString(),
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
        const requestRef = db.ref(`requests/${id}`);
        const requestSnap = await requestRef.once('value');
        if (!requestSnap.exists()) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const data = requestSnap.val();
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
            await requestRef.update({
                status: data.pendingResolution.status,
                userApproval: 'approved',
                pendingResolution: null,
            });
        } else {
            await requestRef.update({
                userApproval: 'rejected',
                pendingResolution: null,
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
        const { userId, role } = req.body;
        const user = { uid: userId, role };
        if (!canPerform(user, 'deleteRequest')) {
            return res.status(403).json({ message: 'Only admin can delete requests' });
        }
        await db.ref('requests').child(id).remove();
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
        const requestRef = db.ref(`requests/${id}`);
        await requestRef.update(updateData);
        res.status(200).json({ message: 'Request updated successfully' });
    } catch (err) {
        console.error('Error updating request:', err);
        res.status(500).json({ message: 'Failed to update request' });
    }
};

exports.getAllRequests = async (req, res) => {
    try {
        const requestsSnap = await db.ref('requests').orderByChild('createdAt').once('value');
        const requestsObj = requestsSnap.val() || {};
        // Convert to array and sort by createdAt desc
        const data = Object.entries(requestsObj)
            .map(([id, d]) => ({ id, ...d, status: mapStatus(d.status) }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(data);
    } catch (err) {
        console.error('Error fetching requests:', err);
        res.status(500).json({ message: 'Failed to fetch requests' });
    }
};

exports.getRequestsByRole = async (req, res) => {
    try {
        const { userId, role } = req.query;
        const user = { uid: userId, role };
        const requestsSnap = await db.ref('requests').orderByChild('createdAt').once('value');
        const requestsObj = requestsSnap.val() || {};
        let data = Object.entries(requestsObj)
            .map(([id, d]) => ({ id, ...d }))
            .filter(doc => canPerform(user, 'viewRequest', doc));
        // Sort by createdAt desc
        data = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(data);
    } catch (err) {
        console.error('Error fetching requests by role:', err);
        res.status(500).json({ message: 'Failed to fetch requests' });
    }
};

// Get assignable users (technicians and leads)
exports.getAssignableUsers = async (req, res) => {
    try {
        const usersSnap = await db.ref('users').once('value');
        const users = usersSnap.val() || {};
        const assignable = Object.entries(users)
            .filter(([_, user]) => ['technician', 'maintenance_lead'].includes(user.role))
            .map(([uid, user]) => ({ uid, ...user }));
        res.json(assignable);
    } catch (err) {
        console.error('Error fetching assignable users:', err);
        res.status(500).json({ message: 'Failed to fetch assignable users' });
    }
};

function mapStatus(status) {
    if (!status) return 'Pending';
    const s = status.toLowerCase();
    if (["pending", "not started"].includes(s)) return "Pending";
    if (["in progress"].includes(s)) return "In Progress";
    if (["resolved", "done", "completed", "not able to fix"].includes(s)) return "Done";
    return "Pending";
}
