const express = require('express');
const router = express.Router();
const { createRequest, getDashboardStats, updateRequestStatus, updateUserApproval, proposeResolution, approveResolution, deleteRequest, updateRequest } = require('../controllers/requestController');
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
    function mapStatus(status) {
        if (!status) return 'Pending';
        const s = status.toLowerCase();
        if (['pending', 'not started'].includes(s)) return 'Pending';
        if (['in progress'].includes(s)) return 'In Progress';
        if (['resolved', 'done', 'completed', 'not able to fix'].includes(s)) return 'Done';
        return 'Pending';
    }
    try {
        const snapshot = await admin.firestore()
            .collection('requests')
            .orderBy('createdAt', 'desc')
            .get();

        const data = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                ...d,
                status: mapStatus(d.status)
            };
        });

        res.json(data);
    } catch (err) {
        console.error('Error fetching requests:', err);
        res.status(500).json({ message: 'Failed to fetch requests' });
    }
});

// PATCH: Update request status (including technician actions)
router.patch('/:id/status', updateRequestStatus);

// PATCH: User approval of technician result
router.patch('/:id/approval', updateUserApproval);

// PATCH: Technician proposes a resolution (pending approval)
router.patch('/:id/propose-resolution', proposeResolution);

// PATCH: Approve or reject a pending resolution
router.patch('/:id/approve-resolution', approveResolution);

// Assign a task to a technician (admin only, with audit trail)
router.post('/assign-task', assignTask);

// Get assignment history for a user (technician or admin)
router.get('/assignments', getAssignmentsForUser);

// Role-based filtering for requests
router.get('/requests-by-role', async (req, res) => {
    try {
        const { userId, role } = req.query;
        const db = admin.firestore();
        let data = [];
        if (role === 'admin' || role === 'lead') {
            const snapshot = await db.collection('requests').orderBy('createdAt', 'desc').get();
            data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            const snapshot = await db.collection('requests').orderBy('createdAt', 'desc').get();
            data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(doc => {
                    const p = Array.isArray(doc.participants) ? doc.participants : [];
                    return p.includes(userId) || doc.createdBy === userId || doc.assignedTo === userId;
                });
        }
        console.log(`[requests-by-role] userId=${userId}, role=${role}, returned=${data.length}`);
        res.json(data);
    } catch (err) {
        console.error('Error fetching requests by role:', err);
        res.status(500).json({ message: 'Failed to fetch requests' });
    }
});

// POST new request
router.post('/', upload.single('photo'), createRequest);

// PATCH: Update a request by ID
router.patch('/:id', updateRequest);

// DELETE: Delete a request by ID
router.delete('/:id', deleteRequest);

module.exports = router;
