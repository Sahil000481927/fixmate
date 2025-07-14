const admin = require('../services/firebase');
const { canPerform } = require('../permissions/permissions');

/**
 * Get all history logs
 * Admins and leads can view all, others see their own
 */
exports.getHistory = async (req, res) => {
    try {
        if (!canPerform(req.user, 'viewHistory')) {
            return res.status(403).json({ error: 'Not authorized to view history' });
        }

        const historySnap = await admin.database().ref('/history').once('value');
        let history = historySnap.val() || {};

        // Convert to array
        history = Object.entries(history).map(([id, entry]) => ({
            id,
            ...entry
        }));

        // Filter for non-admin/lead: only their own or involved
        if (req.user.role !== 'admin' && req.user.role !== 'lead') {
            history = history.filter(h =>
                h.userId === req.user.uid ||
                (h.relatedResource && Array.isArray(h.relatedResource.participants) && h.relatedResource.participants.includes(req.user.uid))
            );
        }

        // Sort by timestamp desc
        history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json(history);
    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};

/**
 * Log a history entry
 */
exports.logHistory = async (req, res) => {
    const { action, details, relatedResource } = req.body;
    if (!action) {
        return res.status(400).json({ error: 'Action is required' });
    }

    try {
        const entry = {
            userId: req.user.uid,
            userName: req.user.name || 'Unknown',
            action,
            details: details || '',
            timestamp: new Date().toISOString(),
            relatedResource: relatedResource || null
        };

        const newEntryRef = admin.database().ref('/history').push();
        await newEntryRef.set(entry);

        res.status(201).json({ message: 'History entry logged', id: newEntryRef.key });
    } catch (err) {
        console.error('Error logging history:', err);
        res.status(500).json({ error: 'Failed to log history' });
    }
};
