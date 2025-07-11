const admin = require('../services/firebase');
const { canPerform } = require('../permissions/permissions');

// Helper to get a reference to the RTDB
const db = admin.database();

// Log an assignment event and update the request in RTDB
exports.assignTask = async (req, res) => {
    try {
        const { taskId, technicianId } = req.body;
        const assignedBy = req.user.uid;
        if (!taskId || !technicianId || !assignedBy) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // Validate assigning user
        const adminSnap = await db.ref(`users/${assignedBy}`).once('value');
        if (!adminSnap.exists()) {
            return res.status(404).json({ message: 'Assigning user not found' });
        }
        const adminData = adminSnap.val();
        // Permission already checked by middleware
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
            assignedAt: new Date().toISOString()
        });
        res.status(200).json({ message: 'Task assigned successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to assign task' });
    }
};

// Get assignments for a user (technician, admin, or lead) from RTDB
exports.getAssignmentsForUser = async (req, res) => {
    try {
        const { userId, role } = req.query;
        const user = { uid: userId, role };
        if (!canPerform(user, 'getAssignmentsForUser')) {
            return res.status(403).json({ message: 'Not authorized to view assignments' });
        }
        let assignmentsSnap = await db.ref('assignments').once('value');
        let assignments = assignmentsSnap.val() || {};
        let data = Object.entries(assignments).map(([id, a]) => ({ id, ...a }));
        if (role === 'technician') {
            data = data.filter(a => a.technicianId === userId);
        } else if (role === 'admin' || role === 'lead') {
            if (userId) {
                data = data.filter(a => a.assignedBy === userId || a.technicianId === userId);
            }
        }
        res.json(data);
    } catch (err) {
        console.error('Error fetching assignments:', err);
        res.status(500).json({ message: 'Failed to fetch assignments' });
    }
};

exports.reassignTask = async (req, res) => {
    try {
        const { assignmentId, newTechnicianId, assignedBy } = req.body;
        if (!assignmentId || !newTechnicianId || !assignedBy) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // Fetch assignment
        const assignmentSnap = await db.ref(`assignments/${assignmentId}`).once('value');
        if (!assignmentSnap.exists()) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        const assignment = assignmentSnap.val();
        // Validate assigning user
        const adminSnap = await db.ref(`users/${assignedBy}`).once('value');
        if (!adminSnap.exists()) {
            return res.status(404).json({ message: 'Assigning user not found' });
        }
        const adminData = adminSnap.val();
        const user = { uid: assignedBy, role: adminData.role };
        if (!canPerform(user, 'reassignTask')) {
            return res.status(403).json({ message: 'Not authorized to reassign tasks' });
        }
        // Validate new technician
        const techSnap = await db.ref(`users/${newTechnicianId}`).once('value');
        if (!techSnap.exists() || techSnap.val().is_active === false) {
            return res.status(404).json({ message: 'Technician not found or inactive' });
        }
        // Update assignment
        await db.ref(`assignments/${assignmentId}`).update({ technicianId: newTechnicianId, assignedBy });
        // Update request's assignedTo and participants
        const requestRef = db.ref(`requests/${assignment.taskId}`);
        const requestSnap = await requestRef.once('value');
        if (requestSnap.exists()) {
            let requestData = requestSnap.val();
            let participants = requestData.participants || [];
            if (!participants.includes(newTechnicianId)) participants.push(newTechnicianId);
            await requestRef.update({ assignedTo: newTechnicianId, assignedBy, participants });
        }
        res.json({ message: 'Task reassigned successfully' });
    } catch (err) {
        console.error('Error reassigning task:', err);
        res.status(500).json({ message: 'Failed to reassign task' });
    }
};

exports.unassignTask = async (req, res) => {
    try {
        const { assignmentId, assignedBy } = req.body;
        if (!assignmentId || !assignedBy) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // Fetch assignment
        const assignmentSnap = await db.ref(`assignments/${assignmentId}`).once('value');
        if (!assignmentSnap.exists()) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        const assignment = assignmentSnap.val();
        // Validate assigning user
        const adminSnap = await db.ref(`users/${assignedBy}`).once('value');
        if (!adminSnap.exists()) {
            return res.status(404).json({ message: 'Assigning user not found' });
        }
        const adminData = adminSnap.val();
        const user = { uid: assignedBy, role: adminData.role };
        if (!canPerform(user, 'unassignTask')) {
            return res.status(403).json({ message: 'Not authorized to unassign tasks' });
        }
        // Remove assignment
        await db.ref(`assignments/${assignmentId}`).remove();
        // Update request's assignedTo and participants
        const requestRef = db.ref(`requests/${assignment.taskId}`);
        const requestSnap = await requestRef.once('value');
        if (requestSnap.exists()) {
            let requestData = requestSnap.val();
            let participants = (requestData.participants || []).filter(p => p !== assignment.technicianId);
            await requestRef.update({ assignedTo: null, assignedBy, participants });
        }
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
