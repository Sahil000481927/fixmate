const express = require('express');
const router = express.Router();
const permission = require('../permissions/permissionMiddleware');
const paymentsController = require('../controllers/paymentsController');

// POST /payments/cashout (Technician/Lead)
router.post('/cashout', permission('requestCashout'), paymentsController.requestCashout);

// GET /user/points (All roles)
router.get('/user/points', permission('viewPoints'), paymentsController.getPoints);

// GET /payments/history (All roles, admin sees all)
router.get('/history', permission('viewCashoutHistory'), paymentsController.getCashoutHistory);

// POST /payments/approve (Admin only)
router.post('/approve', permission('approveCashout'), paymentsController.approveCashoutRequest);

module.exports = router;

