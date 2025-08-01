const admin = require('../services/firebase');
const db = admin.database();
const stripe = require('../config/stripe');
const { logHistory } = require('./historyController');
const { createNotification } = require('./notificationsController');

// Constants
const POINTS_PER_DOLLAR = 100; // 100 points = $1
const MIN_CASHOUT_POINTS = 500; // Minimum 500 points ($5) to cash out
const PLATFORM_FEE_PERCENTAGE = 0.03; // 3% platform fee

// Helper function to log payment activities
const logPaymentActivity = async (userId, action, details, transactionId = null) => {
    try {
        await db.ref('paymentLogs').push({
            userId,
            action,
            details,
            transactionId,
            timestamp: new Date().toISOString(),
            metadata: {
                environment: process.env.NODE_ENV || 'development',
                stripeMode: process.env.STRIPE_SECRET_KEY?.includes('sk_test') ? 'test' : 'live'
            }
        });
    } catch (error) {
        console.error('Failed to log payment activity:', error);
    }
};

// Create Stripe Express account for user
const createStripeAccount = async (user) => {
    try {
        const account = await stripe.accounts.create({
            type: 'express',
            country: 'US',
            email: user.email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true }
            },
            business_type: 'individual',
            individual: {
                first_name: user.name?.split(' ')[0] || 'User',
                last_name: user.name?.split(' ').slice(1).join(' ') || 'Name',
                email: user.email
            },
            settings: {
                payouts: {
                    schedule: {
                        interval: 'manual'
                    }
                }
            }
        });

        // Update user with Stripe account ID
        await db.ref(`users/${user.uid}/stripeAccountId`).set(account.id);

        await logPaymentActivity(user.uid, 'STRIPE_ACCOUNT_CREATED', `Stripe account created: ${account.id}`);

        return account;
    } catch (error) {
        await logPaymentActivity(user.uid, 'STRIPE_ACCOUNT_ERROR', `Failed to create Stripe account: ${error.message}`);
        throw error;
    }
};

// Award points to user
exports.awardPoints = async (userId, points, reason, relatedResource = {}) => {
    try {
        const userRef = db.ref(`users/${userId}`);
        const userSnap = await userRef.once('value');

        if (!userSnap.exists()) {
            throw new Error('User not found');
        }

        const user = userSnap.val();
        const currentPoints = user.points || 0;
        const newPoints = currentPoints + points;

        // Create transaction record first (single source of truth)
        const transactionRef = db.ref('pointsTransactions').push();
        const transactionId = transactionRef.key;

        const transaction = {
            userId,
            type: 'EARNED',
            points,
            reason,
            relatedResource,
            timestamp: new Date().toISOString(),
            status: 'COMPLETED',
            previousBalance: currentPoints,
            newBalance: newPoints
        };

        await transactionRef.set(transaction);

        // Update user points
        await userRef.update({
            points: newPoints,
            lastPointsUpdate: new Date().toISOString()
        });

        await logPaymentActivity(userId, 'POINTS_AWARDED', `${points} points awarded for: ${reason}`, transactionId);

        // Notify user
        try {
            await createNotification({
                userId,
                title: 'Points Earned!',
                message: `You earned ${points} points for ${reason}. Total: ${newPoints} points.`,
                type: 'points'
            });
        } catch (notifErr) {
            console.error('Failed to create points notification:', notifErr);
        }

        return { success: true, transactionId, newBalance: newPoints };
    } catch (error) {
        console.error('Error awarding points:', error);
        await logPaymentActivity(userId, 'POINTS_AWARD_ERROR', `Failed to award points: ${error.message}`);
        throw error;
    }
};

// Get user points balance
exports.getUserPoints = async (req, res) => {
    try {
        const { userId } = req.params;

        // Verify user can access this data
        if (req.user.uid !== userId && !['admin', 'lead'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized to view this user\'s points' });
        }

        const userSnap = await db.ref(`users/${userId}`).once('value');
        if (!userSnap.exists()) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userSnap.val();
        const points = user.points || 0;
        const dollarValue = points / POINTS_PER_DOLLAR;

        res.json({
            points,
            dollarValue: dollarValue.toFixed(2),
            canCashout: points >= MIN_CASHOUT_POINTS,
            minCashoutPoints: MIN_CASHOUT_POINTS,
            stripeAccountId: user.stripeAccountId || null
        });
    } catch (error) {
        console.error('Error fetching user points:', error);
        res.status(500).json({ error: 'Failed to fetch points' });
    }
};

// Request cashout
exports.requestCashout = async (req, res) => {
    try {
        const { points } = req.body;
        const userId = req.user.uid;

        if (!points || points < MIN_CASHOUT_POINTS) {
            return res.status(400).json({
                error: `Minimum cashout is ${MIN_CASHOUT_POINTS} points ($${MIN_CASHOUT_POINTS / POINTS_PER_DOLLAR})`
            });
        }

        // Get user data
        const userSnap = await db.ref(`users/${userId}`).once('value');
        if (!userSnap.exists()) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userSnap.val();
        const currentPoints = user.points || 0;

        if (currentPoints < points) {
            return res.status(400).json({ error: 'Insufficient points' });
        }

        // Create or verify Stripe account
        let stripeAccountId = user.stripeAccountId;
        if (!stripeAccountId) {
            const account = await createStripeAccount({ ...user, uid: userId });
            stripeAccountId = account.id;
        }

        // Calculate payout amount (subtract platform fee)
        const grossAmount = points / POINTS_PER_DOLLAR;
        const platformFee = grossAmount * PLATFORM_FEE_PERCENTAGE;
        const netAmount = grossAmount - platformFee;

        // Create cashout request
        const cashoutRef = db.ref('cashoutRequests').push();
        const cashoutId = cashoutRef.key;

        const cashoutRequest = {
            id: cashoutId,
            userId,
            userName: user.name || 'Unknown User',
            userEmail: user.email,
            points,
            grossAmount: parseFloat(grossAmount.toFixed(2)),
            platformFee: parseFloat(platformFee.toFixed(2)),
            netAmount: parseFloat(netAmount.toFixed(2)),
            stripeAccountId,
            status: 'PENDING',
            requestedAt: new Date().toISOString(),
            requestedBy: userId
        };

        await cashoutRef.set(cashoutRequest);

        await logPaymentActivity(userId, 'CASHOUT_REQUESTED',
            `Cashout requested: ${points} points ($${netAmount.toFixed(2)} after fees)`, cashoutId);

        // Notify admins
        const usersSnap = await db.ref('users').once('value');
        const users = usersSnap.val() || {};
        for (const [uid, userData] of Object.entries(users)) {
            if (userData.role === 'admin') {
                try {
                    await createNotification({
                        userId: uid,
                        title: 'Cashout Request',
                        message: `${user.name || 'User'} requested cashout of ${points} points ($${netAmount.toFixed(2)})`,
                        type: 'cashout',
                        relatedResource: { cashoutId }
                    });
                } catch (notifErr) {
                    console.error('Failed to notify admin:', notifErr);
                }
            }
        }

        res.status(201).json({
            message: 'Cashout request submitted successfully',
            cashoutId,
            netAmount: netAmount.toFixed(2),
            platformFee: platformFee.toFixed(2),
            status: 'PENDING'
        });
    } catch (error) {
        console.error('Error requesting cashout:', error);
        await logPaymentActivity(req.user.uid, 'CASHOUT_REQUEST_ERROR', `Failed to request cashout: ${error.message}`);
        res.status(500).json({ error: 'Failed to request cashout' });
    }
};

// Process cashout (Admin only)
exports.processCashout = async (req, res) => {
    try {
        const { cashoutId } = req.params;
        const { action, adminNotes } = req.body; // 'approve' or 'reject'

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject"' });
        }

        const cashoutRef = db.ref(`cashoutRequests/${cashoutId}`);
        const cashoutSnap = await cashoutRef.once('value');

        if (!cashoutSnap.exists()) {
            return res.status(404).json({ error: 'Cashout request not found' });
        }

        const cashout = cashoutSnap.val();

        if (cashout.status !== 'PENDING') {
            return res.status(400).json({ error: 'Cashout request already processed' });
        }

        if (action === 'reject') {
            await cashoutRef.update({
                status: 'REJECTED',
                processedAt: new Date().toISOString(),
                processedBy: req.user.uid,
                adminNotes: adminNotes || 'No reason provided'
            });

            await logPaymentActivity(cashout.userId, 'CASHOUT_REJECTED',
                `Cashout rejected by admin: ${adminNotes}`, cashoutId);

            // Notify user
            await createNotification({
                userId: cashout.userId,
                title: 'Cashout Rejected',
                message: `Your cashout request for ${cashout.points} points was rejected. ${adminNotes || ''}`,
                type: 'cashout'
            });

            return res.json({ message: 'Cashout request rejected' });
        }

        // Approve cashout
        const userRef = db.ref(`users/${cashout.userId}`);
        const userSnap = await userRef.once('value');

        if (!userSnap.exists()) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userSnap.val();
        const currentPoints = user.points || 0;

        if (currentPoints < cashout.points) {
            return res.status(400).json({ error: 'User has insufficient points' });
        }

        try {
            // Process Stripe transfer
            const transfer = await stripe.transfers.create({
                amount: Math.round(cashout.netAmount * 100), // Convert to cents
                currency: 'usd',
                destination: cashout.stripeAccountId,
                description: `FixMate points cashout - ${cashout.points} points`
            });

            // Create points transaction record
            const transactionRef = db.ref('pointsTransactions').push();
            const transactionId = transactionRef.key;

            const transaction = {
                userId: cashout.userId,
                type: 'CASHOUT',
                points: -cashout.points,
                reason: 'Points cashout',
                relatedResource: { cashoutId, stripeTransferId: transfer.id },
                timestamp: new Date().toISOString(),
                status: 'COMPLETED',
                previousBalance: currentPoints,
                newBalance: currentPoints - cashout.points
            };

            await transactionRef.set(transaction);

            // Update user points
            await userRef.update({
                points: currentPoints - cashout.points,
                lastPointsUpdate: new Date().toISOString()
            });

            // Update cashout request
            await cashoutRef.update({
                status: 'COMPLETED',
                processedAt: new Date().toISOString(),
                processedBy: req.user.uid,
                stripeTransferId: transfer.id,
                transactionId,
                adminNotes: adminNotes || 'Approved and processed'
            });

            await logPaymentActivity(cashout.userId, 'CASHOUT_COMPLETED',
                `Cashout completed: ${cashout.points} points -> $${cashout.netAmount} (Transfer: ${transfer.id})`, cashoutId);

            // Notify user
            await createNotification({
                userId: cashout.userId,
                title: 'Cashout Completed',
                message: `Your cashout of ${cashout.points} points ($${cashout.netAmount}) has been processed successfully!`,
                type: 'cashout'
            });

            res.json({
                message: 'Cashout processed successfully',
                stripeTransferId: transfer.id,
                amountTransferred: cashout.netAmount
            });

        } catch (stripeError) {
            // Mark as failed
            await cashoutRef.update({
                status: 'FAILED',
                processedAt: new Date().toISOString(),
                processedBy: req.user.uid,
                error: stripeError.message,
                adminNotes: adminNotes || 'Stripe transfer failed'
            });

            await logPaymentActivity(cashout.userId, 'CASHOUT_FAILED',
                `Cashout failed: ${stripeError.message}`, cashoutId);

            throw stripeError;
        }

    } catch (error) {
        console.error('Error processing cashout:', error);
        res.status(500).json({ error: 'Failed to process cashout' });
    }
};

// Get cashout history
exports.getCashoutHistory = async (req, res) => {
    try {
        const { userId } = req.query;

        // Build query based on permissions
        let query = db.ref('cashoutRequests');

        if (req.user.role !== 'admin') {
            // Non-admins can only see their own cashouts
            if (userId && userId !== req.user.uid) {
                return res.status(403).json({ error: 'Not authorized to view other users\' cashout history' });
            }
            query = query.orderByChild('userId').equalTo(req.user.uid);
        } else if (userId) {
            // Admin viewing specific user's history
            query = query.orderByChild('userId').equalTo(userId);
        }

        const cashoutSnap = await query.once('value');
        const cashouts = [];

        cashoutSnap.forEach(child => {
            cashouts.push({
                id: child.key,
                ...child.val()
            });
        });

        // Sort by request date (most recent first)
        cashouts.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

        res.json(cashouts);
    } catch (error) {
        console.error('Error fetching cashout history:', error);
        res.status(500).json({ error: 'Failed to fetch cashout history' });
    }
};

// Get points transaction history
exports.getPointsHistory = async (req, res) => {
    try {
        const { userId } = req.query;

        // Build query based on permissions
        let query = db.ref('pointsTransactions');

        if (req.user.role !== 'admin') {
            // Non-admins can only see their own transactions
            if (userId && userId !== req.user.uid) {
                return res.status(403).json({ error: 'Not authorized to view other users\' points history' });
            }
            query = query.orderByChild('userId').equalTo(req.user.uid);
        } else if (userId) {
            // Admin viewing specific user's history
            query = query.orderByChild('userId').equalTo(userId);
        }

        const transactionSnap = await query.once('value');
        const transactions = [];

        transactionSnap.forEach(child => {
            transactions.push({
                id: child.key,
                ...child.val()
            });
        });

        // Sort by timestamp (most recent first)
        transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json(transactions);
    } catch (error) {
        console.error('Error fetching points history:', error);
        res.status(500).json({ error: 'Failed to fetch points history' });
    }
};
