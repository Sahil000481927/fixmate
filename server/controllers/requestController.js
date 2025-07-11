const admin = require('../services/firebase');
const path = require('path');
const db = admin.database();
const { canPerform } = require('../permissions/permissions');

exports.createRequest = async (req, res) => {
    try {
        if (!canPerform(req.user, 'createRequest')) {
            return res.status(403).json({ message: 'Not authorized to create request' });
        }
        const { title, description, machineId, priority } = req.body;
        const createdBy = req.user.uid;
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
        // Create an unassigned assignment for this request
        const assignmentsRef = db.ref('assignments').push();
        await assignmentsRef.set({
            requestId: newRequestRef.key,
            status: 'unassigned',
            assignedTo: null,
            createdAt: requestData.createdAt,
        });
        res.status(201).json({ id: newRequestRef.key, ...requestData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create request' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        if (!canPerform(req.user, 'viewDashboard')) {
            return res.status(403).json({ message: 'Not authorized to view dashboard' });
        }
        const requestsSnap = await db.ref('requests').once('value');
        const requests = requestsSnap.val() || {};
        let filteredRequests = Object.entries(requests).map(([id, r]) => ({ id, ...r }));
        // Filter requests based on user role/permissions
        if (req.user.role === 'technician' || req.user.role === 'operator') {
            filteredRequests = filteredRequests.filter(r =>
                r.createdBy === req.user.uid ||
                r.assignedTo === req.user.uid ||
                (Array.isArray(r.participants) && r.participants.includes(req.user.uid))
            );
        } else if (req.user.role === 'lead') {
            // Leads can see all requests, or you can further filter if needed
        } else if (req.user.role === 'admin') {
            // Admins can see all requests
        } else {
            // Default: only show user's own requests
            filteredRequests = filteredRequests.filter(r => r.createdBy === req.user.uid);
        }
        const totalRequests = filteredRequests.length;
        let pending = 0, inProgress = 0, done = 0;
        filteredRequests.forEach(r => {
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

// New: Get recent requests for dashboard, filtered by user permissions
exports.getDashboardRecentRequests = async (req, res) => {
    try {
        if (!canPerform(req.user, 'viewDashboard')) {
            return res.status(403).json({ message: 'Not authorized to view dashboard' });
        }
        const requestsSnap = await db.ref('requests').once('value');
        const requests = requestsSnap.val() || {};
        let filteredRequests = Object.entries(requests).map(([id, r]) => ({ id, ...r }));
        if (req.user.role === 'technician' || req.user.role === 'operator') {
            filteredRequests = filteredRequests.filter(r =>
                r.createdBy === req.user.uid ||
                r.assignedTo === req.user.uid ||
                (Array.isArray(r.participants) && r.participants.includes(req.user.uid))
            );
        } else if (req.user.role === 'lead') {
            // Leads can see all requests
        } else if (req.user.role === 'admin') {
            // Admins can see all requests
        } else {
            filteredRequests = filteredRequests.filter(r => r.createdBy === req.user.uid);
        }
        // Sort by createdAt descending and return top 5
        filteredRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(filteredRequests.slice(0, 5));
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch recent requests' });
    }
};

exports.assignTask = async (req, res) => {
    try {
        if (!canPerform(req.user, 'assignTask')) {
            return res.status(403).json({ message: 'Not authorized to assign tasks' });
        }
        const { taskId, technicianId } = req.body;
        const assignedBy = req.user.uid;
        if (!taskId || !technicianId || !assignedBy) {
            return res.status(400).json({ message: 'Missing required fields' });
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
        const docSnap = await db.ref(`requests/${id}`).once('value');
        if (!docSnap.exists()) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const data = docSnap.val();
        if (!canPerform(req.user, 'viewRequest', data)) {
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
        const id = req.params.id;
        const docRef = db.ref(`requests/${id}`);
        const docSnap = await docRef.once('value');
        if (!docSnap.exists()) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const data = docSnap.val();
        if (!canPerform(req.user, 'updateRequest', data)) {
            return res.status(403).json({ message: 'Not authorized to update this request' });
        }
        // Harmonize status mapping
        function mapStatus(s) {
            if (!s) return 'Pending';
            const val = s.toLowerCase();
            if (["pending", "not started"].includes(val)) return "Pending";
            if (["in progress"].includes(val)) return "In Progress";
            if (["resolved", "done", "completed", "unfixable"].includes(val)) return "Done";
            return "Pending";
        }
        await docRef.update({ status: mapStatus(req.body.status) });
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
        const { status, userId } = req.body; // status: 'Resolved' | 'Unfixable'
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
        if (!['Resolved', 'Unfixable'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }
        await requestRef.update({
            resolutionRequest: {
                status,
                by: userId,
                at: new Date().toISOString(),
            },
            resolutionRequestStatus: 'pending_approval',
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
        const { approval, userId } = req.body; // approval: 'approved' | 'rejected'
        const id = req.params.id;
        const requestRef = db.ref(`requests/${id}`);
        const requestSnap = await requestRef.once('value');
        if (!requestSnap.exists()) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const data = requestSnap.val();
        // Only creator or admin can approve/reject
        if (data.createdBy !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to approve/reject' });
        }
        if (!data.resolutionRequest || data.resolutionRequestStatus !== 'pending_approval') {
            return res.status(400).json({ message: 'No pending resolution to approve/reject' });
        }
        if (!['approved', 'rejected'].includes(approval)) {
            return res.status(400).json({ message: 'Invalid approval value' });
        }
        if (approval === 'approved') {
            // Harmonize status: 'Resolved' => 'Done', 'Unfixable' => 'Unfixable' (but still in Done column)
            let newStatus = 'Done';
            if (data.resolutionRequest.status === 'Unfixable') {
                newStatus = 'Unfixable';
            }
            await requestRef.update({
                status: newStatus,
                resolutionRequestStatus: 'approved',
                resolutionRequest: {
                    ...data.resolutionRequest,
                    approvedAt: new Date().toISOString(),
                    approvedBy: userId
                }
            });
        } else {
            // If rejected, keep status as Pending
            await requestRef.update({
                status: 'Pending',
                resolutionRequestStatus: 'rejected',
                resolutionRequest: {
                    ...data.resolutionRequest,
                    rejectedAt: new Date().toISOString(),
                    rejectedBy: userId
                }
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
        if (!canPerform(req.user, 'deleteRequest')) {
            return res.status(403).json({ message: 'Only admin can delete requests' });
        }
        // Remove the request
        await db.ref('requests').child(id).remove();
        // Remove related assignments
        const assignmentsSnap = await db.ref('assignments').orderByChild('requestId').equalTo(id).once('value');
        const assignments = assignmentsSnap.val() || {};
        for (const assignmentId of Object.keys(assignments)) {
            await db.ref('assignments').child(assignmentId).remove();
        }
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

exports.getRequestCount = async (req, res) => {
    try {
        if (!canPerform(req.user, 'countRequests')) {
            return res.status(403).json({ message: 'Not authorized to count requests' });
        }
        const requestsSnap = await db.ref('requests').once('value');
        const requests = requestsSnap.val() || {};
        res.json({ count: Object.keys(requests).length });
    } catch (err) {
        res.status(500).json({ message: 'Failed to count requests' });
    }
};

// Harmonize assignment status to request status
function assignmentStatusToRequestStatus(assignmentStatus) {
    switch ((assignmentStatus || '').toLowerCase()) {
        case 'unassigned':
            return 'Pending';
        case 'assigned':
        case 'in_progress':
            return 'In Progress';
        case 'completed':
        case 'done':
            return 'Done';
        case 'not_able_to_fix':
            return 'Unfixable'; // Will be mapped to Done in frontend
        default:
            return 'Pending';
    }
}
// Harmonize request status to assignment status
function requestStatusToAssignmentStatus(requestStatus) {
    switch ((requestStatus || '').toLowerCase()) {
        case 'pending':
            return 'unassigned';
        case 'in progress':
            return 'in_progress';
        case 'done':
            return 'completed';
        case 'unfixable':
            return 'not_able_to_fix';
        default:
            return 'unassigned';
    }
}
