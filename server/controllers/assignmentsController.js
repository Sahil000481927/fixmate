const admin = require('../services/firebase');
const db = admin.database();
const { canPerform } = require('../permissions/permissions');
const { logHistory } = require('./historyController');
const { createNotification } = require('./notificationsController');

// Helper: Update resolution status on request
async function updateResolutionRequest(requestRef, status, details = null) {
    const update = {
        resolutionRequestStatus: status,
        resolutionRequest: details || null
    };
    await requestRef.update(update);
}

// Robust helper: Get all relevant user IDs for an assignment/request activity
async function getRelevantUserIds({ requestData, assignment, users }) {
    const relevant = new Set();
    for (const [uid, user] of Object.entries(users)) {
        if (['admin', 'lead'].includes(user.role)) relevant.add(uid);
    }
    if (requestData?.createdBy) relevant.add(requestData.createdBy);
    if (requestData?.assignedTo) relevant.add(requestData.assignedTo);
    if (assignment?.technicianId) relevant.add(assignment.technicianId);
    if (requestData?.participants && Array.isArray(requestData.participants)) {
        requestData.participants.forEach(uid => relevant.add(uid));
    }
    if (requestData?.assignedBy) relevant.add(requestData.assignedBy);
    if (assignment?.assignedBy) relevant.add(assignment.assignedBy);
    if (assignment?.resolutionProposal?.by) relevant.add(assignment.resolutionProposal.by);
    return Array.from(relevant);
}

exports.assignTask = async (req, res) => {
    try {
        if (!canPerform(req.user, 'assignTask')) {
            return res.status(403).json({ message: 'Not authorized to assign tasks' });
        }

        const { taskId, technicianId } = req.body;
        if (!taskId || !technicianId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Validate technician
        const techSnap = await db.ref(`users/${technicianId}`).once('value');
        if (!techSnap.exists() || !techSnap.val().is_active) {
            return res.status(404).json({ message: 'Technician not found or inactive' });
        }

        // Fetch and update request
        const requestRef = db.ref(`requests/${taskId}`);
        const requestSnap = await requestRef.once('value');
        if (!requestSnap.exists()) {
            return res.status(404).json({ message: 'Request not found' });
        }

        const requestData = requestSnap.val();
        let participants = requestData.participants || [];
        if (!participants.includes(technicianId)) participants.push(technicianId);

        // Set request status to 'In Progress' on assignment
        await requestRef.update({
            assignedTo: technicianId,
            assignedBy: req.user.uid,
            participants,
            status: 'In Progress'
        });

        // Create assignment metadata
        await db.ref('assignments').push({
            taskId,
            technicianId,
            assignedBy: req.user.uid,
            assignedAt: new Date().toISOString(),
            title: requestData.title,
            priority: requestData.priority
        });

        // Notify all relevant users
        try {
            const usersSnap = await db.ref('users').once('value');
            const users = usersSnap.val() || {};
            const notifyUids = await getRelevantUserIds({ requestData: { ...requestData, assignedTo: technicianId, participants }, assignment: { technicianId }, users });
            for (const uid of notifyUids) {
                await createNotification({
                    userId: uid,
                    title: 'Technician Assigned',
                    message: `Technician assigned to request "${requestData.title}".`
                });
            }
        } catch (notifErr) {
            console.error('Failed to create notification:', notifErr);
        }

        // Log history
        try {
            const usersSnap = await db.ref('users').once('value');
            const users = usersSnap.val() || {};
            const notifyUids = await getRelevantUserIds({ requestData: { ...requestData, assignedTo: technicianId, participants }, assignment: { technicianId }, users });
            await logHistory({
                user: req.user,
                body: {
                    action: 'Assigned Technician',
                    details: `Assigned technician ${technicianId} to request "${requestData.title}"`,
                    relatedResource: { taskId, participants, userIds: notifyUids }
                }
            }, { status: () => {}, json: () => {} });
        } catch (logErr) {
            console.error('Failed to log history:', logErr);
        }

        res.json({ message: 'Task assigned successfully' });
    } catch (err) {
        console.error('Error assigning task:', err);
        res.status(500).json({ message: 'Failed to assign task' });
    }
};

exports.getAssignmentsByRole = async (req, res) => {
    try {
        const user = req.user;
        const assignmentsSnap = await db.ref('assignments').once('value');
        let assignments = Object.entries(assignmentsSnap.val() || {}).map(([id, a]) => ({ id, ...a }));

        // Resource-level permission filtering
        assignments = assignments.filter(a => canPerform(user, 'viewAssignment', a));

        // Merge related request data
        const requestsSnap = await db.ref('requests').once('value');
        const requests = requestsSnap.val() || {};

        assignments = assignments.map(a => {
            const req = requests[a.taskId] || {};
            return {
                ...a,
                title: req.title || a.title,
                machineId: req.machineId || a.machineId,
                priority: req.priority || a.priority,
                status: req.status || a.status
            };
        });

        res.json(assignments);
    } catch (err) {
        console.error('Error fetching assignments by role:', err);
        res.status(500).json({ message: 'Failed to fetch assignments' });
    }
};

exports.updateAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const assignmentRef = db.ref(`assignments/${assignmentId}`);
        const assignmentSnap = await assignmentRef.once('value');

        if (!assignmentSnap.exists()) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        if (!canPerform(req.user, 'updateAssignment')) {
            return res.status(403).json({ message: 'Not authorized to update assignments' });
        }

        await assignmentRef.update(req.body);
        res.json({ message: 'Assignment updated successfully' });
    } catch (err) {
        console.error('Error updating assignment:', err);
        res.status(500).json({ message: 'Failed to update assignment' });
    }
};

exports.proposeAssignmentResolution = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const { resolution, description } = req.body;
        const assignmentRef = db.ref(`assignments/${assignmentId}`);
        const assignmentSnap = await assignmentRef.once('value');

        if (!assignmentSnap.exists()) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        if (!canPerform(req.user, 'proposeAssignmentResolution')) {
            return res.status(403).json({ message: 'Not authorized to propose resolution' });
        }

        await assignmentRef.update({
            resolutionProposal: {
                status: resolution,
                description: description || '',
                by: req.user.uid,
                at: new Date().toISOString()
            },
            resolutionRequestStatus: 'pending_approval'
        });

        // Do NOT update request status here (remains 'in progress')

        // Notify all relevant users of new proposal
        const assignment = assignmentSnap.val();
        if (assignment && assignment.taskId) {
            const requestSnap = await db.ref(`requests/${assignment.taskId}`).once('value');
            if (requestSnap.exists()) {
                const requestData = requestSnap.val();
                const usersSnap = await db.ref('users').once('value');
                const users = usersSnap.val() || {};
                const notifyUids = await getRelevantUserIds({ requestData, assignment: { ...assignment, resolutionProposal: { status: resolution, by: req.user.uid } }, users });
                for (const uid of notifyUids) {
                    try {
                        await createNotification({
                            userId: uid,
                            title: 'Resolution Proposal',
                            message: `A resolution proposal for "${requestData.title}" requires your review.`
                        });
                    } catch (notifErr) {
                        console.error('Failed to create notification:', notifErr);
                    }
                }
            }
        }

        res.json({ message: 'Resolution proposed successfully' });
    } catch (err) {
        console.error('Error proposing resolution:', err);
        res.status(500).json({ message: 'Failed to propose resolution' });
    }
};

exports.approveAssignmentResolution = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const { approval } = req.body;
        const assignmentRef = db.ref(`assignments/${assignmentId}`);
        const assignmentSnap = await assignmentRef.once('value');

        if (!assignmentSnap.exists()) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        if (!canPerform(req.user, 'approveAssignmentResolution')) {
            return res.status(403).json({ message: 'Not authorized to approve resolution' });
        }

        await assignmentRef.update({
            resolutionRequestStatus: approval === 'approved' ? 'approved' : 'rejected'
        });

        // Update related request status to 'Completed' on approval or rejection
        const assignment = assignmentSnap.val();
        if (assignment && assignment.taskId) {
            const requestRef = db.ref(`requests/${assignment.taskId}`);
            await requestRef.update({ status: 'Completed' });
            const requestSnap = await requestRef.once('value');
            if (requestSnap.exists()) {
                const requestData = requestSnap.val();
                const usersSnap = await db.ref('users').once('value');
                const users = usersSnap.val() || {};
                const notifyUids = await getRelevantUserIds({ requestData, assignment, users });
                for (const uid of notifyUids) {
                    try {
                        await createNotification({
                            userId: uid,
                            title: 'Resolution Decision',
                            message: `Resolution ${approval} for "${requestData.title}".`
                        });
                    } catch (notifErr) {
                        console.error('Failed to create notification:', notifErr);
                    }
                }
            }
        }

        res.json({ message: `Resolution ${approval}` });
    } catch (err) {
        console.error('Error approving resolution:', err);
        res.status(500).json({ message: 'Failed to approve resolution' });
    }
};

exports.getAssignmentsForUser = async (req, res) => {
    try {
        const userId = req.user.uid;
        const assignmentsSnap = await db.ref('assignments').once('value');
        const userAssignments = Object.entries(assignmentsSnap.val() || {})
            .filter(([id, a]) => a.technicianId === userId)
            .map(([id, a]) => ({ id, ...a }));

        res.json(userAssignments);
    } catch (err) {
        console.error('Error fetching user assignments:', err);
        res.status(500).json({ message: 'Failed to fetch assignments' });
    }
};
