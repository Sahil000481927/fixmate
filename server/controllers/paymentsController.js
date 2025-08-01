const stripe = require('../config/stripe');
const {
  getUserById,
  updateUserPoints,
  createPayoutRecord,
  getPayoutsForUser,
  getAllPayouts,
  approvePayout,
} = require('../services/userService');
const { createNotification } = require('./notificationsController');

// POST /payments/cashout
async function requestCashout(req, res) {
  const { amount } = req.body;
  const userId = req.user.uid;

  try {
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.points || user.points < amount) {
      return res.status(400).json({ error: 'Insufficient points' });
    }
    if (!user.stripeAccountId) {
      return res.status(400).json({ error: 'No Stripe account connected' });
    }
    // 1 point = $1.00 (100 cents)
    const transfer = await stripe.transfers.create({
      amount: amount * 100, // cents
      currency: 'usd',
      destination: user.stripeAccountId,
    });
    await updateUserPoints(userId, user.points - amount);
    await createPayoutRecord(userId, amount, transfer.id, 'pending');
    // Notify user of cashout request
    await createNotification({
      userId,
      title: 'Cashout Requested',
      message: `You have requested to cash out ${amount} points. The request is pending admin approval.`,
    });
    res.status(200).json({ message: 'Cashout requested', transfer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /user/points
async function getPoints(req, res) {
  const userId = req.user.uid;
  try {
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ points: user.points || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /payments/history
async function getCashoutHistory(req, res) {
  const userId = req.user.uid;
  const isAdmin = req.user.role === 'admin';
  try {
    const payouts = isAdmin ? await getAllPayouts() : await getPayoutsForUser(userId);
    res.json({ payouts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// POST /payments/approve
async function approveCashoutRequest(req, res) {
  const { payoutId } = req.body;
  try {
    await approvePayout(payoutId);
    // Notify user of approval
    // Find payout record to get userId and amount
    const allPayouts = await getAllPayouts();
    const payout = allPayouts.find((p) => p.id === payoutId);
    if (payout && payout.userId) {
      await createNotification({
        userId: payout.userId,
        title: 'Cashout Approved',
        message: `Your cashout request for ${payout.amount} points has been approved.`,
      });
    }
    res.json({ message: 'Payout approved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  requestCashout,
  getPoints,
  getCashoutHistory,
  approveCashoutRequest,
};
