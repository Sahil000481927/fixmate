const admin = require('./firebase');

// Fetch user by ID from Realtime Database
async function getUserById(userId) {
  const snapshot = await admin.database().ref(`users/${userId}`).once('value');
  return snapshot.exists() ? { ...snapshot.val(), id: userId } : null;
}

// Update user points
async function updateUserPoints(userId, newPoints) {
  await admin.database().ref(`users/${userId}/points`).set(newPoints);
}

// Increment user points by a value (atomic)
async function incrementUserPoints(userId, incrementBy) {
  const ref = admin.database().ref(`users/${userId}/points`);
  await ref.transaction(current => (current || 0) + incrementBy);
}

// Create a payout record in the payouts node
async function createPayoutRecord(userId, amount, transferId, status = 'pending') {
  await admin.database().ref('payouts').push({
    userId,
    amount,
    transferId,
    status,
    timestamp: new Date().toISOString(),
  });
}

// Get all payouts for a user
async function getPayoutsForUser(userId) {
  const snapshot = await admin.database().ref('payouts').orderByChild('userId').equalTo(userId).once('value');
  const payouts = snapshot.val() || {};
  return Object.entries(payouts).map(([id, data]) => ({ id, ...data }));
}

// Get all payouts (admin)
async function getAllPayouts() {
  const snapshot = await admin.database().ref('payouts').once('value');
  const payouts = snapshot.val() || {};
  return Object.entries(payouts).map(([id, data]) => ({ id, ...data }));
}

// Approve a payout (admin)
async function approvePayout(payoutId) {
  await admin.database().ref(`payouts/${payoutId}/status`).set('approved');
}

module.exports = {
  getUserById,
  updateUserPoints,
  incrementUserPoints,
  createPayoutRecord,
  getPayoutsForUser,
  getAllPayouts,
  approvePayout,
};

