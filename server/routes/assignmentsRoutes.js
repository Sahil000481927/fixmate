const express = require('express');
const router = express.Router();
const {
  assignTask,
  getAssignmentsForUser,
  approveAssignmentResolution,
  proposeAssignmentResolution,
  getAssignmentsByRole,
  updateAssignment
} = require('../controllers/assignmentsController');
const permission = require('../permissions/permissionMiddleware');
const verifyFirebaseToken = require('../services/verifyFirebaseToken');

router.use(verifyFirebaseToken);

router.post('/assign-task', permission('assignTask'), assignTask);
router.get('/my-assignments', permission('getAssignmentsForUser'), getAssignmentsForUser);
router.get('/assignments-by-role', permission('getAssignmentsByRole'), getAssignmentsByRole);
router.patch('/:assignmentId', permission('updateAssignment'), updateAssignment);
router.patch('/:assignmentId/propose-resolution', permission('proposeAssignmentResolution'), proposeAssignmentResolution);
router.patch('/:assignmentId/approve-resolution', permission('approveAssignmentResolution'), approveAssignmentResolution);

module.exports = router;
