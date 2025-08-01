const admin = require('../services/firebase');
const db = admin.database();
const { canPerform } = require('../permissions/permissions');
const { logHistory } = require('./historyController');
const { createNotification } = require('./notificationsController');
const { awardPoints } = require('./paymentsController');

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

        const assignment = assignmentSnap.val();

        await assignmentRef.update({
            resolutionProposal: {
                status: resolution,
                description: description || '',
                by: req.user.uid,
                at: new Date().toISOString()
            },
            resolutionRequestStatus: 'pending_approval'
        });

        // Award points to technician for making a proposal (50 points)
        try {
            const requestId = assignment.taskId || assignment.requestId;
            if (requestId) {
                const requestSnap = await db.ref(`requests/${requestId}`).once('value');
                const requestData = requestSnap.exists() ? requestSnap.val() : {};

                await awardPoints(
                    req.user.uid,
                    50,
                    `Proposed resolution for task: ${requestData.title || 'Task'}`,
                    {
                        type: 'proposal_submission',
                        taskId: requestId,
                        assignmentId,
                        requestTitle: requestData.title,
                        resolution
                    }
                );
            }
        } catch (pointsError) {
            console.error('Failed to award points for proposal:', pointsError);
            // Don't fail the whole operation if points awarding fails
        }

        // Notify all relevant users of new proposal
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
        const { approved, feedback } = req.body;
        const assignmentRef = db.ref(`assignments/${assignmentId}`);
        const assignmentSnap = await assignmentRef.once('value');

        if (!assignmentSnap.exists()) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        if (!canPerform(req.user, 'approveAssignmentResolution')) {
            return res.status(403).json({ message: 'Not authorized to approve resolution' });
        }

        const assignment = assignmentSnap.val();

        // Handle both taskId and requestId for backward compatibility
        const requestId = assignment.taskId || assignment.requestId;
        if (!requestId) {
            return res.status(400).json({ message: 'Assignment missing request reference' });
        }

        const requestRef = db.ref(`requests/${requestId}`);
        const requestSnap = await requestRef.once('value');

        if (!requestSnap.exists()) {
            return res.status(404).json({ message: 'Related request not found' });
        }

        const requestData = requestSnap.val();

        if (approved) {
            // Update assignment with approval
            await assignmentRef.update({
                resolutionRequestStatus: 'approved',
                feedback,
                approvedBy: req.user.uid,
                approvedAt: new Date().toISOString(),
                completedAt: new Date().toISOString()
            });

            // Update request status to completed
            await requestRef.update({
                status: 'Completed',
                completedAt: new Date().toISOString(),
                completedBy: assignment.technicianId,
                approvedBy: req.user.uid
            });

            // Award points for successful completion
            try {
                // Award points to technician (100 points for completing task)
                if (assignment.technicianId) {
                    await awardPoints(
                        assignment.technicianId,
                        100,
                        `Completed maintenance task: ${requestData.title}`,
                        {
                            type: 'task_completion',
                            taskId: assignment.taskId,
                            assignmentId,
                            requestTitle: requestData.title
                        }
                    );
                }

                // Award points to lead/admin who approved (100 points for approval)
                if (['lead', 'admin'].includes(req.user.role)) {
                    await awardPoints(
                        req.user.uid,
                        100,
                        `Approved completed task: ${requestData.title}`,
                        {
                            type: 'task_approval',
                            taskId: assignment.taskId,
                            assignmentId,
                            requestTitle: requestData.title,
                            technicianId: assignment.technicianId
                        }
                    );
                }
            } catch (pointsError) {
                console.error('Failed to award points:', pointsError);
                // Don't fail the whole operation if points awarding fails
            }

            // Notify relevant users of completion
            try {
                const usersSnap = await db.ref('users').once('value');
                const users = usersSnap.val() || {};
                const notifyUids = await getRelevantUserIds({ requestData, assignment, users });

                for (const uid of notifyUids) {
                    await createNotification({
                        userId: uid,
                        title: 'Task Completed',
                        message: `Task "${requestData.title}" has been completed and approved.`,
                        type: 'task_completion'
                    });
                }
            } catch (notifErr) {
                console.error('Failed to create notification:', notifErr);
            }

        } else {
            // Rejection
            await assignmentRef.update({
                resolutionRequestStatus: 'rejected',
                feedback,
                rejectedBy: req.user.uid,
                rejectedAt: new Date().toISOString()
            });

            // Keep request status as 'In Progress' for rejection
            // Notify technician of rejection
            try {
                await createNotification({
                    userId: assignment.technicianId,
                    title: 'Task Resolution Rejected',
                    message: `Your resolution for "${requestData.title}" was rejected. ${feedback || ''}`,
                    type: 'task_rejection'
                });
            } catch (notifErr) {
                console.error('Failed to create notification:', notifErr);
            }
        }

        // Log history
        try {
            const usersSnap = await db.ref('users').once('value');
            const users = usersSnap.val() || {};
            const notifyUids = await getRelevantUserIds({ requestData, assignment, users });
            await logHistory({
                user: req.user,
                body: {
                    action: approved ? 'Approved Assignment Resolution' : 'Rejected Assignment Resolution',
                    details: `${approved ? 'Approved' : 'Rejected'} resolution for "${requestData.title}". ${feedback || ''}`,
                    relatedResource: { assignmentId, taskId: assignment.taskId, userIds: notifyUids }
                }
            }, { status: () => {}, json: () => {} });
        } catch (logErr) {
            console.error('Failed to log history:', logErr);
        }

        res.json({ message: `Assignment resolution ${approved ? 'approved' : 'rejected'} successfully` });
    } catch (err) {
        console.error('Error approving assignment resolution:', err);
        res.status(500).json({ message: 'Failed to approve assignment resolution' });
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
