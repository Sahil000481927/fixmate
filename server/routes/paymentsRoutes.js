const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');
const permission = require('../permissions/permissionMiddleware');
const verifyFirebaseToken = require('../services/verifyFirebaseToken');

router.use(verifyFirebaseToken);

// Points endpoints
router.get('/points/:userId', permission('viewPoints'), paymentsController.getUserPoints);
router.get('/points-history', permission('viewPointsHistory'), paymentsController.getPointsHistory);

// Cashout endpoints
router.post('/cashout', permission('requestCashout'), paymentsController.requestCashout);
router.put('/cashout/:cashoutId/process', permission('processCashout'), paymentsController.processCashout);
router.get('/cashout-history', permission('viewCashoutHistory'), paymentsController.getCashoutHistory);

module.exports = router;
