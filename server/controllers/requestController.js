const admin = require('../services/firebase');
const db = admin.database();
const { canPerform } = require('../permissions/permissions');
const { logHistory } = require('./historyController');
const { createNotification } = require('./notificationsController');

/**
 * Harmonize request status for consistency
 */
function mapStatus(status) {
    if (!status) return 'Pending';
    const s = status.toLowerCase();
    if (['pending', 'not started'].includes(s)) return 'Pending';
    if (['in progress', 'assigned'].includes(s)) return 'In Progress';
    if (['done', 'completed', 'resolved'].includes(s)) return 'Completed';
    if (['unfixable', 'cannot fix'].includes(s)) return 'Unfixable';
    return 'Pending';
}

/**
 * Helper: Get all relevant user IDs for an activity
 */
async function getRelevantUserIds({ requestData, users }) {
    const relevant = new Set();
    for (const [uid, user] of Object.entries(users)) {
        if (['admin', 'lead'].includes(user.role)) relevant.add(uid);
    }
    if (requestData?.createdBy) relevant.add(requestData.createdBy);
    if (requestData?.assignedTo) relevant.add(requestData.assignedTo);
    if (requestData?.participants && Array.isArray(requestData.participants)) {
        requestData.participants.forEach(uid => relevant.add(uid));
    }
    if (requestData?.assignedBy) relevant.add(requestData.assignedBy);
    return Array.from(relevant);
}

/**
 * Create a new maintenance request
 */
exports.createRequest = async (req, res) => {
    try {
        if (!canPerform(req.user, 'createRequest')) {
            return res.status(403).json({ message: 'Not authorized to create requests' });
        }

        const { title, description, machineId, priority } = req.body;
        const createdBy = req.user.uid;
        const createdAt = new Date().toISOString();

        const requestData = {
            title,
            description,
            machineId,
            priority,
            createdBy,
            status: 'Pending',
            createdAt,
            participants: [createdBy],
        };

        const newRequestRef = db.ref('requests').push();
        await newRequestRef.set(requestData);

        // Auto-create an unassigned assignment
        await db.ref('assignments').push({
            requestId: newRequestRef.key,
            status: 'unassigned',
            assignedTo: null,
            createdAt
        });

        // Log history
        try {
            const usersSnap = await db.ref('users').once('value');
            const users = usersSnap.val() || {};
            const notifyUids = await getRelevantUserIds({ requestData, users });
            await logHistory({
                user: req.user,
                body: {
                    action: 'Created Request',
                    details: `Request "${title}" created by ${req.user.name || req.user.uid}`,
                    relatedResource: { requestId: newRequestRef.key, userIds: notifyUids }
                }
            }, { status: () => {}, json: () => {} });
        } catch (logErr) {
            console.error('Failed to log history:', logErr);
        }
        // Notify all relevant users
        try {
            const usersSnap = await db.ref('users').once('value');
            const users = usersSnap.val() || {};
            const notifyUids = await getRelevantUserIds({ requestData, users });
            for (const uid of notifyUids) {
                await createNotification({
                    userId: uid,
                    title: 'New Request',
                    message: `A new request "${title}" was created.`
                });
            }
        } catch (notifErr) {
            console.error('Failed to create notification:', notifErr);
        }
        res.status(201).json({ id: newRequestRef.key, ...requestData });
    } catch (err) {
        console.error('Error creating request:', err);
        res.status(500).json({ message: 'Failed to create request' });
    }
};

/**
 * Get dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
    try {
        if (!canPerform(req.user, 'viewDashboardStats')) {
            return res.status(403).json({ message: 'Not authorized to view dashboard stats' });
        }

        const requestsSnap = await db.ref('requests').once('value');
        const requestsObj = requestsSnap.val() || {};
        let requests = Object.entries(requestsObj).map(([id, r]) => ({
            id,
            ...r,
            status: mapStatus(r.status)
        }));

        // Fix: Filter by assignments for technician
        if (req.user.role === 'technician') {
            const assignmentsSnap = await db.ref('assignments').once('value');
            const assignments = Object.values(assignmentsSnap.val() || {});
            const assignedRequestIds = assignments
                .filter(a => a.technicianId === req.user.uid)
                .map(a => a.requestId)
                .filter(Boolean);
            requests = requests.filter(r =>
                r.createdBy === req.user.uid ||
                assignedRequestIds.includes(r.id) ||
                (r.participants || []).includes(req.user.uid)
            );
        }

        const stats = {
            totalRequests: requests.length,
            pending: requests.filter(r => r.status === 'Pending').length,
            inProgress: requests.filter(r => r.status === 'In Progress').length,
            completed: requests.filter(r => r.status === 'Completed').length
        };

        res.json(stats);
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
};

/**
 * Get recent requests for dashboard
 */
exports.getDashboardRecentRequests = async (req, res) => {
    try {
        if (!canPerform(req.user, 'viewDashboardRecent')) {
            return res.status(403).json({ message: 'Not authorized to view recent requests' });
        }

        const requestsSnap = await db.ref('requests').once('value');
        let requests = Object.entries(requestsSnap.val() || {}).map(([id, r]) => ({
            id,
            ...r,
            status: mapStatus(r.status)
        }));

        // Fix: Filter by assignments for technician
        if (req.user.role === 'technician') {
            const assignmentsSnap = await db.ref('assignments').once('value');
            const assignments = Object.values(assignmentsSnap.val() || {});
            const assignedRequestIds = assignments
                .filter(a => a.technicianId === req.user.uid)
                .map(a => a.requestId)
                .filter(Boolean);
            requests = requests.filter(r =>
                r.createdBy === req.user.uid ||
                assignedRequestIds.includes(r.id) ||
                (r.participants || []).includes(req.user.uid)
            );
        }

        requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(requests.slice(0, 5));
    } catch (err) {
        console.error('Error fetching recent requests:', err);
        res.status(500).json({ message: 'Failed to fetch recent requests' });
    }
};

/**
 * Get all requests
 */
exports.getAllRequests = async (req, res) => {
    try {
        if (!canPerform(req.user, 'viewAllRequests')) {
            return res.status(403).json({ message: 'Not authorized to view all requests' });
        }

        const requestsSnap = await db.ref('requests').once('value');
        const requestsObj = requestsSnap.val() || {};
        const requests = Object.entries(requestsObj)
            .map(([id, r]) => ({ id, ...r, status: mapStatus(r.status) }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(requests);
    } catch (err) {
        console.error('Error fetching all requests:', err);
        res.status(500).json({ message: 'Failed to fetch requests' });
    }
};

/**
 * Update a request by ID (restrict fields for operator/technician)
 */
exports.updateRequest = async (req, res) => {
    try {
        if (!canPerform(req.user, 'updateRequest')) {
            return res.status(403).json({ message: 'Not authorized to update requests' });
        }
        const { id } = req.params;
        let updates = req.body;
        // Restrict fields for operator/technician
        if (['operator', 'technician'].includes(req.user.role)) {
            const allowed = ['title', 'priority', 'description', 'machineId'];
            updates = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
        }
        const requestRef = db.ref(`requests/${id}`);
        await requestRef.update(updates);
        // Log history
        try {
            await logHistory({
                user: req.user,
                body: {
                    action: 'Updated Request',
                    details: `Request "${id}" updated by ${req.user.name || req.user.uid}`,
                    relatedResource: { requestId: id }
                }
            }, { status: () => {}, json: () => {} });
        } catch (logErr) {
            console.error('Failed to log history:', logErr);
        }
        // Notify creator if status changed
        if (updates.status) {
            const reqSnap = await requestRef.once('value');
            if (reqSnap.exists()) {
                const reqData = reqSnap.val();
                try {
                    await createNotification({
                        userId: reqData.createdBy,
                        title: 'Request Status Updated',
                        message: `Status changed to ${updates.status} for "${reqData.title}".`
                    });
                } catch (notifErr) {
                    console.error('Failed to create notification:', notifErr);
                }
            }
        }
        res.json({ message: 'Request updated successfully' });
    } catch (err) {
        console.error('Error updating request:', err);
        res.status(500).json({ message: 'Failed to update request' });
    }
};

/**
 * Delete a request by ID
 */
exports.deleteRequest = async (req, res) => {
    try {
        if (!canPerform(req.user, 'deleteRequest')) {
            return res.status(403).json({ message: 'Not authorized to delete requests' });
        }
        const { id } = req.params;
        const reqSnap = await db.ref(`requests/${id}`).once('value');
        let reqData = null;
        if (reqSnap.exists()) reqData = reqSnap.val();
        await db.ref(`requests/${id}`).remove();
        // Cascade delete assignments
        const assignmentsSnap = await db.ref('assignments')
            .orderByChild('requestId').equalTo(id).once('value');
        const assignments = assignmentsSnap.val() || {};
        for (const assignmentId of Object.keys(assignments)) {
            await db.ref(`assignments/${assignmentId}`).remove();
        }
        // Log history
        try {
            await logHistory({
                user: req.user,
                body: {
                    action: 'Deleted Request',
                    details: `Request "${id}" deleted by ${req.user.name || req.user.uid}`,
                    relatedResource: { requestId: id }
                }
            }, { status: () => {}, json: () => {} });
        } catch (logErr) {
            console.error('Failed to log history:', logErr);
        }
        // Notify creator if not self
        if (reqData && reqData.createdBy && reqData.createdBy !== req.user.uid) {
            try {
                await createNotification({
                    userId: reqData.createdBy,
                    title: 'Request Deleted',
                    message: `Your request "${reqData.title}" has been deleted by an admin/lead.`
                });
            } catch (notifErr) {
                console.error('Failed to create notification:', notifErr);
            }
        }
        // Notify deletion requester if not creator
        if (reqData && reqData.deletionRequestedBy && reqData.deletionRequestedBy !== reqData.createdBy) {
            try {
                await createNotification({
                    userId: reqData.deletionRequestedBy,
                    title: 'Request Deletion Approved',
                    message: `Your deletion request for "${reqData.title}" was approved and deleted by an admin/lead.`
                });
            } catch (notifErr) {
                console.error('Failed to create notification:', notifErr);
            }
        }
        res.json({ message: 'Request and related assignments deleted' });
    } catch (err) {
        console.error('Error deleting request:', err);
        res.status(500).json({ message: 'Failed to delete request' });
    }
};

exports.getRequestCount = async (req, res) => {
    try {
        if (!canPerform(req.user, 'countRequests')) {
            return res.status(403).json({ message: 'Not authorized to count requests' });
        }
        const snap = await db.ref('requests').once('value');
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;
        res.json({ count });
    } catch (err) {
        console.error('Error counting requests:', err);
        res.status(500).json({ message: 'Failed to count requests' });
    }
};

exports.updateRequestStatus = async (req, res) => {
    try {
        if (!canPerform(req.user, 'updateRequestStatus')) {
            return res.status(403).json({ message: 'Not authorized to update status' });
        }
        const { id } = req.params;
        const { status } = req.body;

        const requestRef = db.ref(`requests/${id}`);
        const snap = await requestRef.once('value');
        if (!snap.exists()) return res.status(404).json({ message: 'Request not found' });

        await requestRef.update({ status: mapStatus(status) });

        // Defensive: get latest data after update
        const updatedSnap = await requestRef.once('value');
        const reqData = updatedSnap.val();

        try {
            await logHistory({
                user: req.user,
                body: {
                    action: 'Updated Request Status',
                    details: `Status for "${reqData?.title || id}" changed to ${status}`,
                    relatedResource: { requestId: id }
                }
            }, { status: () => {}, json: () => {} });
        } catch (logErr) {
            console.error('Failed to log history:', logErr);
        }

        if (reqData?.createdBy) {
            try {
                await createNotification({
                    userId: reqData.createdBy,
                    title: 'Request Status Updated',
                    message: `Status changed to ${status} for "${reqData.title || id}".`
                });
            } catch (notifErr) {
                console.error('Failed to create notification:', notifErr);
            }
        }

        res.json({ message: 'Request status updated' });
    } catch (err) {
        console.error('Error updating status:', err);
        res.status(500).json({ message: 'Failed to update request status' });
    }
};

exports.updateUserApproval = async (req, res) => {
    try {
        if (!canPerform(req.user, 'userApproveResolution')) {
            return res.status(403).json({ message: 'Not authorized for user approval' });
        }
        const { id } = req.params;
        const { approval } = req.body;

        const requestRef = db.ref(`requests/${id}`);
        const snap = await requestRef.once('value');
        if (!snap.exists()) return res.status(404).json({ message: 'Request not found' });

        await requestRef.update({ userApproval: approval });

        await logHistory({
            user: req.user,
            body: {
                action: 'User Approved Resolution',
                details: `User approved resolution for "${snap.val().title}"`,
                relatedResource: { requestId: id }
            }
        }, { status: () => {}, json: () => {} });

        res.json({ message: 'User approval updated' });
    } catch (err) {
        console.error('Error updating user approval:', err);
        res.status(500).json({ message: 'Failed to update user approval' });
    }
};

exports.proposeResolution = async (req, res) => {
    try {
        if (!canPerform(req.user, 'proposeResolution')) {
            return res.status(403).json({ message: 'Not authorized to propose resolution' });
        }
        const { id } = req.params;
        const { resolution } = req.body;

        const requestRef = db.ref(`requests/${id}`);
        const snap = await requestRef.once('value');
        if (!snap.exists()) return res.status(404).json({ message: 'Request not found' });

        await requestRef.update({
            proposedResolution: resolution,
            resolutionStatus: 'pending_approval'
        });

        await logHistory({
            user: req.user,
            body: {
                action: 'Proposed Resolution',
                details: `Resolution proposed for "${snap.val().title}"`,
                relatedResource: { requestId: id }
            }
        }, { status: () => {}, json: () => {} });

        res.json({ message: 'Resolution proposed successfully' });
    } catch (err) {
        console.error('Error proposing resolution:', err);
        res.status(500).json({ message: 'Failed to propose resolution' });
    }
};

exports.approveResolution = async (req, res) => {
    try {
        if (!canPerform(req.user, 'approveResolution')) {
            return res.status(403).json({ message: 'Not authorized to approve resolution' });
        }
        const { id } = req.params;
        const { approval } = req.body;

        const requestRef = db.ref(`requests/${id}`);
        const snap = await requestRef.once('value');
        if (!snap.exists()) return res.status(404).json({ message: 'Request not found' });

        const newStatus = approval === 'approved' ? 'Completed' : 'Pending';
        await requestRef.update({
            resolutionStatus: approval,
            status: newStatus
        });

        await logHistory({
            user: req.user,
            body: {
                action: 'Resolution Approved',
                details: `Resolution ${approval} for "${snap.val().title}"`,
                relatedResource: { requestId: id }
            }
        }, { status: () => {}, json: () => {} });

        res.json({ message: `Resolution ${approval}` });
    } catch (err) {
        console.error('Error approving resolution:', err);
        res.status(500).json({ message: 'Failed to approve resolution' });
    }
};

/**
 * Get pending request counts by user
 */
exports.getPendingCountsByUser = async (req, res) => {
    try {
        if (!canPerform(req.user, 'viewAllRequests')) {
            return res.status(403).json({ message: 'Not authorized to view requests' });
        }
        const requestsSnap = await db.ref('requests').once('value');
        const requests = Object.values(requestsSnap.val() || {});
        const counts = {};
        requests.forEach(r => {
            if ((r.status || '').toLowerCase() === 'pending' && r.createdBy) {
                counts[r.createdBy] = (counts[r.createdBy] || 0) + 1;
            }
        });
        res.json(counts);
    } catch (err) {
        console.error('Error fetching pending counts by user:', err);
        res.status(500).json({ message: 'Failed to fetch pending counts' });
    }
};

/**
 * Operator/Technician requests deletion of a request (admin/lead must approve)
 */
exports.requestDeleteRequest = async (req, res) => {
    try {
        if (!canPerform(req.user, 'requestDeleteRequest')) {
            return res.status(403).json({ message: 'Not authorized to request deletion' });
        }
        const { id } = req.params;
        const requestRef = db.ref(`requests/${id}`);
        const snap = await requestRef.once('value');
        if (!snap.exists()) return res.status(404).json({ message: 'Request not found' });
        const reqData = snap.val();
        // Mark as deletion requested
        await requestRef.update({ deletionRequested: true, deletionRequestedBy: req.user.uid });
        // Log history
        try {
            await logHistory({
                user: req.user,
                body: {
                    action: 'Requested Deletion',
                    details: `User ${req.user.name || req.user.uid} requested deletion of request "${reqData.title}"`,
                    relatedResource: { requestId: id }
                }
            }, { status: () => {}, json: () => {} });
        } catch (logErr) {
            console.error('Failed to log history:', logErr);
        }
        // Notify all admins/leads
        try {
            const usersSnap = await db.ref('users').once('value');
            const users = usersSnap.val() || {};
            for (const [uid, user] of Object.entries(users)) {
                if (['admin', 'lead'].includes(user.role)) {
                    await createNotification({
                        userId: uid,
                        title: 'Request Deletion has been requested successfully',
                        message: `User ${req.user.name || req.user.uid} requested deletion of request "${reqData.title}".`
                    });
                }
            }
        } catch (notifErr) {
            console.error('Failed to create notification:', notifErr);
        }
        res.json({ message: 'Deletion request submitted and admins notified.' });
    } catch (err) {
        console.error('Error requesting deletion:', err);
        res.status(500).json({ message: 'Failed to request deletion' });
    }
};

/**
 * Approve deletion of a request
 */
exports.approveDeleteRequest = async (req, res) => {
    try {
        if (!canPerform(req.user, 'deleteRequest')) {
            return res.status(403).json({ message: 'Not authorized to approve deletion' });
        }
        const { id } = req.params;
        const requestRef = db.ref(`requests/${id}`);
        const snap = await requestRef.once('value');
        if (!snap.exists()) return res.status(404).json({ message: 'Request not found' });
        // Soft delete: set deleted: true
        await requestRef.update({ deleted: true, deletionRequested: null, deletionRequestedBy: null });
        await logHistory({
            user: req.user,
            body: {
                action: 'Approved Deletion',
                details: `Request ${id} approved for deletion by ${req.user.name || req.user.uid}`,
                relatedResource: { requestId: id }
            }
        }, { status: () => {}, json: () => {} });
        res.json({ message: 'Request deleted (soft) successfully.' });
    } catch (err) {
        console.error('Error approving deletion:', err);
        res.status(500).json({ message: 'Failed to approve deletion' });
    }
};

/**
 * Reject deletion of a request
 */
exports.rejectDeleteRequest = async (req, res) => {
    try {
        if (!canPerform(req.user, 'deleteRequest')) {
            return res.status(403).json({ message: 'Not authorized to reject deletion' });
        }
        const { id } = req.params;
        const requestRef = db.ref(`requests/${id}`);
        const snap = await requestRef.once('value');
        if (!snap.exists()) return res.status(404).json({ message: 'Request not found' });
        await requestRef.update({ deletionRequested: null, deletionRequestedBy: null });
        await logHistory({
            user: req.user,
            body: {
                action: 'Rejected Deletion',
                details: `Request ${id} deletion rejected by ${req.user.name || req.user.uid}`,
                relatedResource: { requestId: id }
            }
        }, { status: () => {}, json: () => {} });
        res.json({ message: 'Request deletion rejected.' });
    } catch (err) {
        console.error('Error rejecting deletion:', err);
        res.status(500).json({ message: 'Failed to reject deletion' });
    }
};

/**
 * Get requests filtered by user role (for /requests-by-role)
 */
exports.getRequestsByRole = async (req, res) => {
    try {
        const { userId } = req.query;
        const userSnap = await db.ref(`users/${userId}`).once('value');
        if (!userSnap.exists()) return res.status(404).json({ message: 'User not found' });
        const user = userSnap.val();
        const requestsSnap = await db.ref('requests').once('value');
        const requestsObj = requestsSnap.val() || {};
        let requests = Object.entries(requestsObj).map(([id, r]) => ({ id, ...r }));

        if (user.role === 'operator') {
            requests = requests.filter(r => r.createdBy === userId);
        } else if (user.role === 'technician') {
            // Fix: Use assignments to determine assigned requests
            const assignmentsSnap = await db.ref('assignments').once('value');
            const assignments = Object.values(assignmentsSnap.val() || {});
            const assignedRequestIds = assignments
                .filter(a => a.technicianId === userId)
                .map(a => a.requestId)
                .filter(Boolean);
            requests = requests.filter(r =>
                r.createdBy === userId ||
                assignedRequestIds.includes(r.id) ||
                (r.participants || []).includes(userId)
            );
        }

        // For admin/lead, return all
        requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(requests);
    } catch (err) {
        console.error('Error fetching requests by role:', err);
        res.status(500).json({ message: 'Failed to fetch requests' });
    }
};

/**
 * Get requests for the current user (operator: created, technician: assigned/participant)
 */
exports.getMyRequests = async (req, res) => {
    try {
        const user = req.user;
        const requestsSnap = await db.ref('requests').once('value');
        let requests = Object.entries(requestsSnap.val() || {}).map(([id, r]) => ({ id, ...r, status: mapStatus(r.status) }));
        // Filter using canPerform for each request
        requests = requests.filter(r => canPerform(user, 'viewRequest', r));
        // Sort by createdAt desc
        requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(requests);
    } catch (err) {
        console.error('Error fetching my requests:', err);
        res.status(500).json({ message: 'Failed to fetch requests' });
    }
};
