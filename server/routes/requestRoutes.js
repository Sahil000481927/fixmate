const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const permission = require('../permissions/permissionMiddleware');
const verifyFirebaseToken = require('../services/verifyFirebaseToken');

router.use(verifyFirebaseToken);

router.get('/dashboard-stats', permission('viewDashboardStats'), requestController.getDashboardStats);
router.get('/dashboard-recent', permission('viewDashboardRecent'), requestController.getDashboardRecentRequests);
router.get('/', permission('viewAllRequests'), requestController.getAllRequests);
router.get('/count', permission('countRequests'), requestController.getRequestCount);
router.post('/', permission('createRequest'), requestController.createRequest);
router.patch('/:id', permission('updateRequest'), requestController.updateRequest);
router.patch('/:id/status', permission('updateRequestStatus'), requestController.updateRequestStatus);
router.patch('/:id/approval', permission('userApproveResolution'), requestController.updateUserApproval);
router.patch('/:id/propose-resolution', permission('proposeResolution'), requestController.proposeResolution);
router.patch('/:id/approve-resolution', permission('approveResolution'), requestController.approveResolution);
router.delete('/:id', permission('deleteRequest'), requestController.deleteRequest);
router.get('/pending-counts-by-user', permission('viewAllRequests'), requestController.getPendingCountsByUser);
router.post('/:id/request-delete', permission('requestDeleteRequest'), requestController.requestDeleteRequest);
router.get('/requests-by-role', requestController.getRequestsByRole);
router.post('/:id/approve-delete', permission('deleteRequest'), requestController.approveDeleteRequest);
router.post('/:id/reject-delete', permission('deleteRequest'), requestController.rejectDeleteRequest);

module.exports = router;
