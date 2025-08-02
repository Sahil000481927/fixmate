const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');
const permission = require('../permissions/permissionMiddleware');
const verifyFirebaseToken = require('../services/verifyFirebaseToken');

// Special route for Stripe webhooks (no authentication required)
router.post('/webhook', express.raw({type: 'application/json'}), paymentsController.handleStripeWebhook);

// Apply authentication to all other routes
router.use(verifyFirebaseToken);

// Points endpoints
router.get('/points/:userId', permission('viewPoints'), paymentsController.getUserPoints);
router.get('/points-history', permission('viewPointsHistory'), paymentsController.getPointsHistory);

// Stripe onboarding endpoints
router.post('/onboarding/start', permission('requestCashout'), paymentsController.startStripeOnboarding);
router.get('/onboarding/status', permission('requestCashout'), paymentsController.checkOnboardingStatus);

// Test mode endpoints (only available in test mode)
router.post('/simulate-revenue', permission('admin'), paymentsController.simulatePlatformRevenue);
router.post('/make-funds-available', permission('admin'), paymentsController.makeFundsAvailable);

// FixMate account endpoints (Admin only)
router.post('/admin/fixmate-account/create', permission('admin'), paymentsController.createFixMateAccount);
router.post('/admin/fixmate-account/onboarding', permission('admin'), paymentsController.startFixMateOnboarding);
router.get('/admin/fixmate-account/status', permission('admin'), paymentsController.checkFixMateAccountStatus);
router.post('/admin/fixmate-account/add-funds', permission('admin'), paymentsController.addFundsToFixMateAccount);

// Cashout endpoints
router.post('/cashout', permission('requestCashout'), paymentsController.requestCashout);
router.put('/cashout/:cashoutId/process', permission('processCashout'), paymentsController.processCashout);
router.delete('/cashout/:cashoutId', permission('admin'), paymentsController.deleteCashoutRequest);
router.get('/cashout-history', permission('viewCashoutHistory'), paymentsController.getCashoutHistory);

// Legacy compatibility endpoints (for old paymentRoutes.js)
router.get('/user/points', permission('viewPoints'), (req, res) => {
    req.params.userId = req.user.uid;
    paymentsController.getUserPoints(req, res);
});
router.get('/history', permission('viewCashoutHistory'), paymentsController.getCashoutHistory);
router.post('/approve', permission('processCashout'), paymentsController.processCashout);

// Admin endpoints for processing cashouts
router.put('/cashout/:cashoutId', permission('processCashout'), paymentsController.processCashout);

// Admin endpoints for Stripe account management
router.get('/admin/users-with-stripe', permission('admin'), paymentsController.getAllUsersWithStripeAccounts);
router.get('/admin/all-cashouts', permission('admin'), paymentsController.getAllCashoutRequests);
router.delete('/admin/stripe-account/:userId', permission('admin'), paymentsController.deleteStripeAccount);
router.get('/admin/platform-stats', permission('admin'), paymentsController.getPlatformStatistics);

module.exports = router;
