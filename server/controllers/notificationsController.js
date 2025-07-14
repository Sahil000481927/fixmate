const admin = require('../services/firebase');
const { canPerform } = require('../permissions/permissions');

/**
 * Get notifications for current user
 * Admin/Lead: see all
 * Technician: see theirs + assigned events
 * Operator: see theirs
 */
exports.getNotifications = async (req, res) => {
    try {
        if (!canPerform(req.user, 'viewNotifications')) {
            return res.status(403).json({ error: 'Not authorized to view notifications' });
        }

        const snap = await admin.database().ref('/notifications').once('value');
        let notifications = snap.val() || {};

        notifications = Object.entries(notifications)
            .map(([id, n]) => ({ id, ...n }))
            .filter(n =>
                !n.deleted &&
                (
                    req.user.role === 'admin' ||
                    req.user.role === 'lead' ||
                    n.userId === req.user.uid
                )
            )
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(notifications);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

/**
 * Mark notification as read/unread
 */
exports.updateNotification = async (req, res) => {
    const { id } = req.params;
    const { read } = req.body;

    if (!canPerform(req.user, 'updateNotifications')) {
        return res.status(403).json({ error: 'Not authorized to update notifications' });
    }

    try {
        const ref = admin.database().ref(`/notifications/${id}`);
        const snap = await ref.once('value');
        if (!snap.exists()) return res.status(404).json({ error: 'Notification not found' });

        const notif = snap.val();
        if (notif.userId !== req.user.uid && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized for this notification' });
        }

        await ref.update({ read });
        res.json({ message: 'Notification updated' });
    } catch (err) {
        console.error('Error updating notification:', err);
        res.status(500).json({ error: 'Failed to update notification' });
    }
};

/**
 * Soft delete notification (admin only)
 */
exports.deleteNotification = async (req, res) => {
    const { id } = req.params;

    if (!canPerform(req.user, 'deleteNotifications')) {
        return res.status(403).json({ error: 'Not authorized to delete notifications' });
    }

    try {
        const ref = admin.database().ref(`/notifications/${id}`);
        const snap = await ref.once('value');
        if (!snap.exists()) return res.status(404).json({ error: 'Notification not found' });

        await ref.update({ deleted: true });
        res.json({ message: 'Notification deleted' });
    } catch (err) {
        console.error('Error deleting notification:', err);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
};

/**
 * Internal helper: Create a notification
 */
exports.createNotification = async ({ userId, title, message, assignedTo = null }) => {
    try {
        const entry = {
            userId,
            title,
            message,
            assignedTo,
            read: false,
            deleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const newRef = admin.database().ref('/notifications').push();
        await newRef.set(entry);
        return newRef.key;
    } catch (err) {
        console.error('Error creating notification:', err);
    }
};
