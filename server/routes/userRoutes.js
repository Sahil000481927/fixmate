const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyFirebaseToken = require('../services/verifyFirebaseToken');

// Protect all user routes
router.use(verifyFirebaseToken);

// Get permissions for a user
router.get('/:uid/permissions', userController.getUserPermissions);

module.exports = router;

