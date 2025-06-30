const express = require('express');
const router = express.Router();
const { assignTask, getAssignmentsForUser } = require('../controllers/assignmentsController');

// Assign a task to a technician (admin only, with audit trail)
router.post('/assign-task', assignTask);

// Get assignment history for a user (technician or admin)
router.get('/assignments', getAssignmentsForUser);

module.exports = router;

