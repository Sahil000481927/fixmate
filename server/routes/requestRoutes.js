const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { createRequest, getDashboardStats, updateRequestStatus, updateUserApproval, proposeResolution, approveResolution, deleteRequest, updateRequest, getAssignableUsers } = requestController;
const { assignTask, getAssignmentsForUser } = require('../controllers/assignmentsController');
const multer = require('multer');
const admin = require('../services/firebase');
const permission = require('../permissions/permissionMiddleware');

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
router.get('/', permission('viewAllRequests'), requestController.getAllRequests);
router.patch('/:id/status', permission('updateRequest'), updateRequestStatus);
router.patch('/:id/approval', updateUserApproval); // checked in controller
router.patch('/:id/propose-resolution', proposeResolution); // checked in controller
router.patch('/:id/approve-resolution', approveResolution); // checked in controller
router.post('/assign-task', permission('assignTask'), assignTask);
router.get('/assignments', permission('getAssignmentsForUser'), getAssignmentsForUser);
router.get('/assignable-users', getAssignableUsers); // checked in controller
router.get('/requests-by-role', requestController.getRequestsByRole); // checked in controller
router.post('/', upload.single('photo'), permission('createRequest'), createRequest);

// PATCH: Update a request by ID
router.patch('/:id', updateRequest);

// DELETE: Delete a request by ID
router.delete('/:id', deleteRequest);

module.exports = router;
