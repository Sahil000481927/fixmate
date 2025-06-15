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
