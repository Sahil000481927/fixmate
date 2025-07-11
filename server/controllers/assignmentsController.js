const admin = require('../services/firebase');
const { canPerform } = require('../permissions/permissions');

// Helper to get a reference to the RTDB
const db = admin.database();

// Helper to update resolution request status on a request
async function updateResolutionRequest(requestRef, status, details = null) {
    const update = {
        resolutionRequestStatus: status,
        resolutionRequest: details || null
    };
    await requestRef.update(update);
}
// Log an assignment event and update the request in RTDB
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
        const requestData = requestSnap.val();
        if (!canPerform(req.user, 'assignTask', requestData)) {
            return res.status(403).json({ message: 'Not authorized to assign this request' });
        }
        const creatorId = requestData.createdBy;
        // Update assignedTo, assignedBy, and participants
        let participants = requestData.participants || [];
        if (!participants.includes(technicianId)) participants.push(technicianId);
        if (!participants.includes(creatorId)) participants.push(creatorId);
        await requestRef.update({
            assignedTo: technicianId,
            assignedBy: assignedBy,
            participants
        });
        // Log the assignment event
        const assignmentRef = db.ref('assignments').push();
        await assignmentRef.set({
            taskId,
            technicianId,
            assignedBy,
            assignedAt: new Date().toISOString(),
            // Add title and priority for easier frontend access
            title: requestData.title || '',
            priority: requestData.priority || ''
        });
        res.status(200).json({ message: 'Task assigned successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to assign task' });
    }
};

// Get assignments for a user (technician, admin, or lead) from RTDB
exports.getAssignmentsForUser = async (req, res) => {
    try {
        if (!canPerform(req.user, 'getAssignmentsForUser')) {
            return res.status(403).json({ message: 'Not authorized to view assignments' });
        }
        let assignmentsSnap = await db.ref('assignments').once('value');
        let assignments = assignmentsSnap.val() || {};
        let assignmentArr = Object.entries(assignments).map(([id, a]) => ({ id, ...a }));
        // Use canPerform for filtering
        let userAssignments = assignmentArr.filter(a => canPerform(req.user, 'getAssignmentsForUser', a));
        const requestsSnap = await db.ref('requests').once('value');
        const requests = requestsSnap.val() || {};
        const result = userAssignments.map(a => {
            const req = requests[a.taskId];
            if (!req) return null;
            return {
                ...req,
                id: a.taskId,
                assignmentId: a.id,
                assignedBy: a.assignedBy,
                assignedAt: a.assignedAt,
                technicianId: a.technicianId,
                title: req.title,
                priority: req.priority
            };
        }).filter(Boolean);
        res.json(result);
    } catch (err) {
        console.error('Error fetching assignments:', err);
        res.status(500).json({ message: 'Failed to fetch assignments' });
    }
};

exports.reassignTask = async (req, res) => {
    try {
        if (!canPerform(req.user, 'reassignTask')) {
            return res.status(403).json({ message: 'Not authorized to reassign tasks' });
        }
        const { assignmentId, newTechnicianId } = req.body;
        if (!assignmentId || !newTechnicianId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // Fetch assignment
        const assignmentSnap = await db.ref(`assignments/${assignmentId}`).once('value');
        if (!assignmentSnap.exists()) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        const assignment = assignmentSnap.val();
        // Validate new technician
        const techSnap = await db.ref(`users/${newTechnicianId}`).once('value');
        if (!techSnap.exists() || techSnap.val().is_active === false) {
            return res.status(404).json({ message: 'Technician not found or inactive' });
        }
        // Update assignment
        await db.ref(`assignments/${assignmentId}`).update({ technicianId: newTechnicianId, assignedBy: req.user.uid });
        // Update request's assignedTo and participants
        const requestRef = db.ref(`requests/${assignment.taskId}`);
        const requestSnap = await requestRef.once('value');
        if (requestSnap.exists()) {
            let requestData = requestSnap.val();
            let participants = requestData.participants || [];
            if (!participants.includes(newTechnicianId)) participants.push(newTechnicianId);
            await requestRef.update({ assignedTo: newTechnicianId, assignedBy: req.user.uid, participants });
        }
        res.json({ message: 'Task reassigned successfully' });
    } catch (err) {
        console.error('Error reassigning task:', err);
        res.status(500).json({ message: 'Failed to reassign task' });
    }
};

exports.unassignTask = async (req, res) => {
    try {
        if (!canPerform(req.user, 'unassignTask')) {
            return res.status(403).json({ message: 'Not authorized to unassign tasks' });
        }
        const { assignmentId } = req.body;
        if (!assignmentId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // Fetch assignment
        const assignmentSnap = await db.ref(`assignments/${assignmentId}`).once('value');
        if (!assignmentSnap.exists()) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        // Remove assignment
        await db.ref(`assignments/${assignmentId}`).remove();
        res.json({ message: 'Task unassigned successfully' });
    } catch (err) {
        console.error('Error unassigning task:', err);
        res.status(500).json({ message: 'Failed to unassign task' });
    }
};

exports.deleteAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, role } = req.body;
        const user = { uid: userId, role };
        if (!canPerform(user, 'deleteAssignment')) {
            return res.status(403).json({ message: 'Not authorized to delete assignment' });
        }
        await db.ref(`assignments/${id}`).remove();
        res.json({ message: 'Assignment deleted successfully' });
    } catch (err) {
        console.error('Error deleting assignment:', err);
        res.status(500).json({ message: 'Failed to delete assignment' });
    }
};

exports.getAssignmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const snap = await db.ref(`assignments/${id}`).once('value');
        if (!snap.exists()) return res.status(404).json({ message: 'Assignment not found' });
        res.json({ id, ...snap.val() });
    } catch (err) {
        console.error('Error fetching assignment:', err);
        res.status(500).json({ message: 'Failed to fetch assignment' });
    }
};

exports.getAllAssignments = async (req, res) => {
    try {
        const { userId, role } = req.query;
        const user = { uid: userId, role };
        if (!canPerform(user, 'getAllAssignments')) {
            return res.status(403).json({ message: 'Not authorized to view all assignments' });
        }
        const snap = await db.ref('assignments').once('value');
        const assignments = snap.val() || {};
        const data = Object.entries(assignments).map(([id, a]) => ({ id, ...a }));
        res.json(data);
    } catch (err) {
        console.error('Error fetching assignments:', err);
        res.status(500).json({ message: 'Failed to fetch assignments' });
    }
};

exports.getAssignmentCount = async (req, res) => {
    try {
        if (!canPerform(req.user, 'countAssignments')) {
            return res.status(403).json({ message: 'Not authorized to count assignments' });
        }
        const assignmentsSnap = await db.ref('assignments').once('value');
        const assignments = assignmentsSnap.val() || {};
        res.json({ count: Object.keys(assignments).length });
    } catch (err) {
        res.status(500).json({ message: 'Failed to count assignments' });
    }
};

// Get assignments by role (role-aware, for frontend)
exports.getAssignmentsByRole = async (req, res) => {
    try {
        const { userId, role } = req.query;
        if (!userId || !role) {
            return res.status(400).json({ message: 'Missing userId or role' });
        }
        const user = { uid: userId, role };
        if (!canPerform(user, 'getAssignmentsByRole')) {
            return res.status(403).json({ message: 'Not authorized to view assignments' });
        }
        let assignmentsSnap = await db.ref('assignments').once('value');
        let assignments = assignmentsSnap.val() || {};
        let assignmentArr = Object.entries(assignments).map(([id, a]) => ({ id, ...a }));
        let userAssignments = assignmentArr.filter(a => canPerform(user, 'getAssignmentsByRole', a));
        const requestsSnap = await db.ref('requests').once('value');
        const requests = requestsSnap.val() || {};
        let result = userAssignments.map(a => {
            const req = requests[a.taskId];
            if (!req) return null;
            return {
                ...req,
                id: a.taskId,
                assignmentId: a.id,
                assignedBy: a.assignedBy,
                assignedAt: a.assignedAt,
                technicianId: a.technicianId,
                title: req.title,
                priority: req.priority
            };
        }).filter(Boolean);
        if (canPerform(user, 'getAllAssignments') && result.length === 0 && userAssignments.length > 0) {
            result = userAssignments;
        }
        res.json(result);
    } catch (err) {
        console.error('Error fetching assignments by role:', err);
        res.status(500).json({ message: 'Failed to fetch assignments by role' });
    }
};

// Approve or reject a resolution proposal for an assignment
exports.approveResolution = async (req, res) => {
    try {
        const { id } = req.params;
        const { approval } = req.body; // 'approved' or 'rejected'
        if (!approval || !['approved', 'rejected'].includes(approval)) {
            return res.status(400).json({ message: 'Invalid approval value' });
        }
        // Fetch assignment
        const assignmentSnap = await db.ref(`assignments/${id}`).once('value');
        if (!assignmentSnap.exists()) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        const assignment = assignmentSnap.val();
        if (!canPerform(req.user, 'approveResolution', assignment)) {
            return res.status(403).json({ message: 'Not authorized to approve/reject resolution' });
        }
        // Update the related request's resolutionRequestStatus
        const requestRef = db.ref(`requests/${assignment.taskId}`);
        const requestSnap = await requestRef.once('value');
        if (!requestSnap.exists()) {
            return res.status(404).json({ message: 'Related request not found' });
        }
        if (approval === 'rejected') {
            await requestRef.update({
                resolutionRequestStatus: 'not_proposed',
                resolutionRequest: null
            });
        } else {
            await requestRef.update({
                resolutionRequestStatus: approval
            });
        }
        res.json({ message: `Resolution ${approval}` });
    } catch (err) {
        console.error('Error approving/rejecting resolution:', err);
        res.status(500).json({ message: 'Failed to update resolution approval' });
    }
};
