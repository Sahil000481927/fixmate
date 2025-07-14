const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const verifyFirebaseToken = require('../services/verifyFirebaseToken');
const permission = require('../permissions/permissionMiddleware');

router.use(verifyFirebaseToken);

router.get('/list', permission('viewNotifications'), notificationsController.getNotifications);
router.patch('/update/:id', permission('updateNotifications'), notificationsController.updateNotification);
router.delete('/remove/:id', permission('deleteNotifications'), notificationsController.deleteNotification);

module.exports = router;
