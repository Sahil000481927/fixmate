const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const permission = require('../permissions/permissionMiddleware');
const verifyFirebaseToken = require('../services/verifyFirebaseToken');

router.use(verifyFirebaseToken);

router.get('/:uid/permissions', userController.getUserPermissions);
router.get('/', permission('viewUsers'), userController.getAllUsers);
router.get('/count', permission('countUsers'), userController.getUserCount);
router.post('/profile', userController.createOwnProfile);
router.post('/', permission('inviteUser'), userController.createUserProfile);
router.patch('/:uid/role', permission('elevateRole'), userController.updateUserRole);
router.delete('/:uid', permission('removeUser'), userController.deleteUser);

module.exports = router;
