const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const verifyFirebaseToken = require('../services/verifyFirebaseToken');
const permission = require('../permissions/permissionMiddleware');

router.use(verifyFirebaseToken);

router.get('/', permission('viewHistory'), historyController.getHistory);
router.post('/', permission('logHistory'), historyController.logHistory);

module.exports = router;
