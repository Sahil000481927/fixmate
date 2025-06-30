const express = require('express');
const router = express.Router();
const { createRequest, getDashboardStats } = require('../controllers/requestController');
const { assignTask, getAssignmentsForUser } = require('../controllers/assignmentsController');
const multer = require('multer');
const admin = require('../services/firebase');

// Multer config
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        const ext = file.originalname.split('.').pop();
        const uniqueName = `req-${Date.now()}.${ext}`;
        cb(null, uniqueName);
    },
});
const upload = multer({ storage });

router.get('/dashboard-stats', getDashboardStats);


// GET all requests
router.get('/', async (req, res) => {
    try {
        const snapshot = await admin.firestore()
            .collection('requests')
            .orderBy('createdAt', 'desc')
            .get();

        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(data);
    } catch (err) {
        console.error('Error fetching requests:', err);
        res.status(500).json({ message: 'Failed to fetch requests' });
    }
});

// GET request by ID
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const id = req.params.id;

        if (!['Pending', 'In Progress', 'Done'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        await admin.firestore().collection('requests').doc(id).update({ status });

        res.status(200).json({ message: 'Status updated', id });
    } catch (err) {
        console.error('Failed to update status:', err);
        res.status(500).json({ message: 'Update failed' });
    }
});

// Assign a task to a technician (admin only, with audit trail)
router.post('/assign-task', assignTask);

// Get assignment history for a user (technician or admin)
router.get('/assignments', getAssignmentsForUser);

// Role-based filtering for requests
router.get('/requests-by-role', async (req, res) => {
    try {
        const { userId, role } = req.query;
        const db = admin.firestore();
        let query;
        if (role === 'technician') {
            query = db.collection('requests').where('assignedTo', '==', userId);
        } else if (role === 'operator') {
            query = db.collection('requests').where('createdBy', '==', userId);
        } else if (role === 'admin' || role === 'lead') {
            query = db.collection('requests'); // all requests
        } else {
            return res.status(400).json({ message: 'Invalid role' });
        }
        const snapshot = await query.get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(data);
    } catch (err) {
        console.error('Error fetching requests by role:', err);
        res.status(500).json({ message: 'Failed to fetch requests' });
    }
});

// POST new request
router.post('/', upload.single('photo'), createRequest);

module.exports = router;
