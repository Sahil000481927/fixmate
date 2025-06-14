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
