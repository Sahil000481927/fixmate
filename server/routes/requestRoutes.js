const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { createRequest, getDashboardStats, updateRequestStatus, updateUserApproval, proposeResolution, approveResolution, deleteRequest, updateRequest, getAssignableUsers } = requestController;
const { assignTask, getAssignmentsForUser } = require('../controllers/assignmentsController');
const multer = require('multer');
const admin = require('../services/firebase');
const permission = require('../permissions/permissionMiddleware');
const verifyFirebaseToken = require('../services/verifyFirebaseToken');

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

router.get('/dashboard-stats', verifyFirebaseToken, getDashboardStats);
router.get('/dashboard-recent', verifyFirebaseToken, requestController.getDashboardRecentRequests);
router.get('/', verifyFirebaseToken, permission('viewAllRequests'), requestController.getAllRequests);
router.patch('/:id/status', verifyFirebaseToken, permission('updateRequest'), updateRequestStatus);
router.patch('/:id/approval', verifyFirebaseToken, updateUserApproval); // checked in controller
router.patch('/:id/propose-resolution', verifyFirebaseToken, proposeResolution); // checked in controller
router.patch('/:id/approve-resolution', verifyFirebaseToken, approveResolution); // checked in controller
router.post('/assign-task', verifyFirebaseToken, permission('assignTask'), assignTask);
router.get('/assignments', verifyFirebaseToken, permission('getAssignmentsForUser'), getAssignmentsForUser);
router.get('/assignable-users', verifyFirebaseToken, getAssignableUsers); // checked in controller
router.get('/requests-by-role', verifyFirebaseToken, requestController.getRequestsByRole); // checked in controller
router.post('/', verifyFirebaseToken, upload.single('photo'), permission('createRequest'), createRequest);

router.get('/count', verifyFirebaseToken, requestController.getRequestCount);

// PATCH: Update a request by ID
router.patch('/:id', verifyFirebaseToken, updateRequest);

// DELETE: Delete a request by ID
router.delete('/:id', verifyFirebaseToken, deleteRequest);

module.exports = router;
