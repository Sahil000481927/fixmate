const express = require('express');
const router = express.Router();
const {
  assignTask,
  getAssignmentsForUser,
  reassignTask,
  unassignTask,
  deleteAssignment,
  getAssignmentById,
  getAllAssignments
} = require('../controllers/assignmentsController');
const permission = require('../permissions/permissionMiddleware');

// Assign a task to a technician (admin only, with audit trail)
router.post('/assign-task', permission('assignTask'), assignTask);

// Reassign a task to a different technician (admin only, with audit trail)
router.post('/reassign-task', permission('reassignTask'), reassignTask);

// Unassign a task from a technician (admin only, with audit trail)
router.post('/unassign-task', permission('unassignTask'), unassignTask);

// Delete an assignment (admin only)
router.delete('/:id', permission('deleteAssignment'), deleteAssignment);

// Get a specific assignment by ID (admin only)
router.get('/:id', getAssignmentById); // resource-based, checked in controller

// Get all assignments (admin only)
router.get('/', permission('getAllAssignments'), getAllAssignments);

// Get assignment history for a user (technician or admin)
router.get('/assignments', permission('getAssignmentsForUser'), getAssignmentsForUser);

module.exports = router;
