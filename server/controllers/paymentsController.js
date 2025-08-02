const admin = require('../services/firebase');
const db = admin.database();
const { stripe, STRIPE_CONFIG } = require('../config/stripe');
const { logHistory } = require('./historyController');
const { createNotification } = require('./notificationsController');

// Constants
const POINTS_PER_DOLLAR = STRIPE_CONFIG.POINTS_PER_DOLLAR;
const MIN_CASHOUT_POINTS = STRIPE_CONFIG.MIN_CASHOUT_POINTS;
const PLATFORM_FEE_PERCENTAGE = STRIPE_CONFIG.PLATFORM_FEE_PERCENTAGE;
const MIN_BALANCE_THRESHOLD = STRIPE_CONFIG.MIN_BALANCE_THRESHOLD;

// Check if we're in test mode
const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('sk_test') || false;

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
                isTestMode,
                stripeMode: isTestMode ? 'test' : 'live'
            }
        });
    } catch (error) {
        console.error('Failed to log payment activity:', error);
    }
};

// Create Stripe Express Account for user
const createStripeExpressAccount = async (user) => {
    try {
        console.log(`Creating Stripe Express account for user: ${user.uid}`);
        
        // Validate required data
        if (!user.email) {
            throw new Error('User email is required for Stripe account creation');
        }
        
        // Check if stripe is properly initialized
        if (!stripe) {
            throw new Error('Stripe not properly initialized');
        }

        // Create Express Account with minimal required information
        const accountData = {
            type: 'express',
            country: STRIPE_CONFIG.COUNTRY,
            email: user.email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: 'individual',
            settings: {
                payouts: {
                    schedule: {
                        interval: 'manual' // We'll control when payouts happen
                    }
                }
            }
        };
        
        // Add individual info if name is available
        if (user.name) {
            const nameParts = user.name.split(' ');
            accountData.individual = {
                first_name: nameParts[0] || '',
                last_name: nameParts.slice(1).join(' ') || '',
                email: user.email,
            };
        }
        
        console.log('Creating Stripe account with data:', JSON.stringify(accountData, null, 2));
        const account = await stripe.accounts.create(accountData);

        // Update user with Stripe account ID
        await db.ref(`users/${user.uid}`).update({
            stripeAccountId: account.id,
            stripeAccountCreated: new Date().toISOString(),
            stripeOnboardingComplete: false
        });

        await logPaymentActivity(user.uid, 'STRIPE_ACCOUNT_CREATED',
            `Stripe Express account created: ${account.id}`);

        return account;
    } catch (error) {
        console.error('Detailed error creating Stripe account:', {
            message: error.message,
            type: error.type,
            code: error.code,
            decline_code: error.decline_code,
            param: error.param
        });
        await logPaymentActivity(user.uid, 'STRIPE_ACCOUNT_ERROR',
            `Failed to create Stripe account: ${error.message}`);
        throw error;
    }
};

// Create onboarding link for Stripe Express account
const createOnboardingLink = async (accountId, userId) => {
    try {
        console.log(`Creating onboarding link for account ${accountId}`);
        
        if (!accountId) {
            throw new Error('Account ID is required');
        }
        
        if (!STRIPE_CONFIG.ONBOARDING.refresh_url || !STRIPE_CONFIG.ONBOARDING.return_url) {
            throw new Error('Onboarding URLs not configured properly');
        }
        
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: STRIPE_CONFIG.ONBOARDING.refresh_url,
            return_url: STRIPE_CONFIG.ONBOARDING.return_url,
            type: 'account_onboarding',
        });

        await logPaymentActivity(userId, 'ONBOARDING_LINK_CREATED',
            `Onboarding link created for account: ${accountId}`);

        console.log('Onboarding link created:', accountLink.url);
        return accountLink;
    } catch (error) {
        console.error('Detailed error creating onboarding link:', {
            message: error.message,
            type: error.type,
            code: error.code,
            accountId
        });
        await logPaymentActivity(userId, 'ONBOARDING_LINK_ERROR',
            `Failed to create onboarding link: ${error.message}`);
        throw error;
    }
};

// Check if account onboarding is complete
const checkAccountOnboarding = async (accountId, userId) => {
    try {
        const account = await stripe.accounts.retrieve(accountId);
        
        const onboardingComplete = account.details_submitted && 
                                 account.charges_enabled && 
                                 account.payouts_enabled;

        // Update user record with onboarding status
        await db.ref(`users/${userId}`).update({
            stripeOnboardingComplete: onboardingComplete,
            stripeChargesEnabled: account.charges_enabled,
            stripePayoutsEnabled: account.payouts_enabled,
            lastOnboardingCheck: new Date().toISOString()
        });

        await logPaymentActivity(userId, 'ONBOARDING_STATUS_CHECKED',
            `Account ${accountId} onboarding complete: ${onboardingComplete}`);

        return {
            complete: onboardingComplete,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            requirements: account.requirements
        };
    } catch (error) {
        await logPaymentActivity(userId, 'ONBOARDING_CHECK_ERROR',
            `Failed to check onboarding status: ${error.message}`);
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

// Get user points balance and Stripe account status
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

        // Check Stripe account status if exists
        let stripeAccountStatus = null;
        let actualOnboardingComplete = user.stripeOnboardingComplete || false;
        
        console.log(`Getting points for user ${userId}:`, {
            hasStripeAccountId: !!user.stripeAccountId,
            stripeAccountId: user.stripeAccountId,
            cachedOnboardingComplete: user.stripeOnboardingComplete,
            points
        });
        
        if (user.stripeAccountId) {
            try {
                const accountStatus = await checkAccountOnboarding(user.stripeAccountId, userId);
                stripeAccountStatus = accountStatus;
                actualOnboardingComplete = accountStatus.complete; // Use live status from Stripe
                console.log(`Live Stripe status from getUserPoints for user ${userId}:`, accountStatus);
            } catch (error) {
                console.error('Error checking Stripe account status:', error);
            }
        }

        res.json({
            points,
            pointsBalance: points, // Add explicit pointsBalance field for frontend compatibility
            dollarValue: dollarValue.toFixed(2),
            canCashout: points >= MIN_CASHOUT_POINTS && actualOnboardingComplete,
            minCashoutPoints: MIN_CASHOUT_POINTS,
            minCashoutDollars: (MIN_CASHOUT_POINTS / POINTS_PER_DOLLAR).toFixed(2),
            isTestMode,
            stripeAccountId: user.stripeAccountId || null,
            stripeOnboardingComplete: actualOnboardingComplete, // Use live status
            stripeAccountStatus,
            requiresOnboarding: !actualOnboardingComplete,
            conversionRate: {
                pointsPerDollar: POINTS_PER_DOLLAR,
                dollarsPerPoint: 1 / POINTS_PER_DOLLAR
            }
        });
    } catch (error) {
        console.error('Error fetching user points:', error);
        res.status(500).json({ error: 'Failed to fetch points' });
    }
};

// Start Stripe onboarding process
exports.startStripeOnboarding = async (req, res) => {
    try {
        console.log('Starting Stripe onboarding process...');
        const userId = req.user.uid;
        console.log('User ID:', userId);
        
        // Check if environment variables are loaded
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('STRIPE_SECRET_KEY not found in environment variables');
            return res.status(500).json({ error: 'Stripe configuration not found' });
        }
        
        const userSnap = await db.ref(`users/${userId}`).once('value');
        if (!userSnap.exists()) {
            console.log('User not found in database:', userId);
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userSnap.val();
        console.log('User data:', { uid: userId, email: user.email, name: user.name });
        
        // Ensure the user object has the uid
        user.uid = userId;
        
        let accountId = user.stripeAccountId;

        // Create Stripe account if doesn't exist
        if (!accountId) {
            console.log(`Creating new Stripe account for user ${userId}`);
            try {
                const account = await createStripeExpressAccount(user);
                accountId = account.id;
                console.log(`Created Stripe account ${accountId} for user ${userId}`);
            } catch (createError) {
                console.error('Error creating Stripe account:', createError);
                return res.status(500).json({ 
                    error: 'Failed to create Stripe account', 
                    details: createError.message 
                });
            }
        } else {
            console.log(`Using existing Stripe account ${accountId} for user ${userId}`);
        }

        // Create onboarding link
        try {
            const accountLink = await createOnboardingLink(accountId, userId);
            console.log('Onboarding link created successfully');
            
            res.json({
                onboardingUrl: accountLink.url,
                accountId,
                message: 'Please complete the onboarding process to enable cashouts'
            });
        } catch (linkError) {
            console.error('Error creating onboarding link:', linkError);
            return res.status(500).json({ 
                error: 'Failed to create onboarding link', 
                details: linkError.message 
            });
        }
    } catch (error) {
        console.error('Error starting Stripe onboarding:', error);
        await logPaymentActivity(req.user?.uid || 'unknown', 'ONBOARDING_START_ERROR', `Failed to start onboarding: ${error.message}`);
        res.status(500).json({ 
            error: 'Failed to start onboarding process',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Check onboarding status
exports.checkOnboardingStatus = async (req, res) => {
    try {
        const userId = req.user.uid;
        
        const userSnap = await db.ref(`users/${userId}`).once('value');
        if (!userSnap.exists()) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userSnap.val();
        
        console.log(`Checking onboarding status for user ${userId}:`, {
            hasStripeAccountId: !!user.stripeAccountId,
            stripeAccountId: user.stripeAccountId,
            cachedOnboardingComplete: user.stripeOnboardingComplete
        });
        
        if (!user.stripeAccountId) {
            console.log(`User ${userId} has no Stripe account`);
            return res.json({
                onboardingComplete: false,
                accountExists: false,
                hasStripeAccount: false, // Add this for frontend compatibility
                message: 'No Stripe account found. Please start onboarding process.'
            });
        }

        const status = await checkAccountOnboarding(user.stripeAccountId, userId);
        
        console.log(`Live Stripe status for user ${userId}:`, status);
        
        res.json({
            onboardingComplete: status.complete,
            accountExists: true,
            hasStripeAccount: true, // Add this for frontend compatibility
            accountId: user.stripeAccountId,
            chargesEnabled: status.chargesEnabled,
            payoutsEnabled: status.payoutsEnabled,
            requirements: status.requirements,
            canCashout: status.complete && status.payoutsEnabled
        });
    } catch (error) {
        console.error('Error checking onboarding status:', error);
        res.status(500).json({ error: 'Failed to check onboarding status' });
    }
};

// Simulate platform revenue (for testing - adds balance to platform account)
exports.simulatePlatformRevenue = async (req, res) => {
    try {
        if (!isTestMode) {
            return res.status(400).json({ error: 'This endpoint is only available in test mode' });
        }

        const { amount = 10000 } = req.body; // Default $100 in cents
        
        const charge = await stripe.charges.create({
            amount: amount,
            currency: STRIPE_CONFIG.CURRENCY,
            source: STRIPE_CONFIG.TEST_TOKENS.VISA,
            description: 'Simulated platform revenue for testing cashouts'
        });

        await logPaymentActivity('platform', 'SIMULATED_REVENUE',
            `Simulated platform revenue: $${amount / 100}`, charge.id);

        res.json({
            message: `Successfully added $${amount / 100} to platform balance`,
            chargeId: charge.id,
            amount: amount / 100,
            note: 'This is test money for testing cashout functionality',
            info: 'Funds may be in pending state. Use "Make Funds Available" to move to available balance.'
        });
    } catch (error) {
        console.error('Error simulating platform revenue:', error);
        res.status(500).json({ error: 'Failed to simulate platform revenue' });
    }
};

// Make pending funds available (for testing - only works in test mode)
exports.makeFundsAvailable = async (req, res) => {
    try {
        if (!isTestMode) {
            return res.status(400).json({ error: 'This endpoint is only available in test mode' });
        }

        const balance = await stripe.balance.retrieve();
        const pendingBalance = balance.pending.find(b => b.currency === 'usd');
        const availableBalance = balance.available.find(b => b.currency === 'usd');
        
        await logPaymentActivity('platform', 'BALANCE_CHECK',
            `Current balance - Available: $${(availableBalance?.amount || 0) / 100}, Pending: $${(pendingBalance?.amount || 0) / 100}`);

        // Check if this is likely a new Stripe account with 7-day payout delay
        const pendingAmount = (pendingBalance?.amount || 0) / 100;
        const availableAmount = (availableBalance?.amount || 0) / 100;

        if (pendingAmount > 0 && availableAmount === 0) {
            return res.json({
                message: 'Stripe 7-Day Payout Delay Detected',
                availableAmount: 0,
                pendingAmount: pendingAmount,
                explanation: 'New Stripe accounts have a 7-day waiting period for the first payout. This cannot be waived, even in test mode.',
                workaround: 'For testing purposes, you can simulate the cashout flow, but actual payouts will show as "pending" until the waiting period ends.',
                testingSuggestion: 'Use the "Process Cashout" admin function to simulate approval - it will handle the insufficient balance gracefully.',
                stripeInfo: 'This is normal Stripe behavior for risk mitigation. In production, users would wait 7 days for their first payout.',
                howToTest: 'You can still test the full cashout flow - the system will detect insufficient balance and provide appropriate error messages.'
            });
        }

        if (availableAmount > 0) {
            return res.json({
                message: `You have $${availableAmount} available for cashouts`,
                availableAmount: availableAmount,
                pendingAmount: pendingAmount,
                note: 'Funds are ready for cashouts!'
            });
        }

        if (pendingAmount === 0) {
            return res.json({ 
                message: 'No balance found. Try simulating revenue first.',
                pendingAmount: 0,
                availableAmount: 0,
                suggestion: 'Click "Simulate Platform Revenue" to add test funds, then wait for the 7-day period or test with insufficient balance scenarios.'
            });
        }

        // If we get here, something unexpected happened
        res.json({
            message: 'Balance check completed',
            availableAmount: availableAmount,
            pendingAmount: pendingAmount,
            note: 'Check the amounts above. If funds are pending, this is likely due to Stripe\'s 7-day first payout delay.'
        });

    } catch (error) {
        console.error('Error checking balance:', error);
        
        res.status(500).json({ 
            error: 'Failed to check balance',
            details: error.message,
            testModeNote: 'Stripe enforces a 7-day waiting period for first payouts, even in test mode',
            recommendation: 'You can still test the cashout request and approval flow - the system handles insufficient balance scenarios appropriately'
        });
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

        // Check if user has completed Stripe onboarding
        if (!user.stripeAccountId || !user.stripeOnboardingComplete) {
            return res.status(400).json({ 
                error: 'You must complete the Stripe onboarding process before requesting a cashout',
                requiresOnboarding: true,
                stripeAccountId: user.stripeAccountId || null
            });
        }

        // Verify Stripe account is still valid and payout-enabled
        try {
            const accountStatus = await checkAccountOnboarding(user.stripeAccountId, userId);
            if (!accountStatus.complete || !accountStatus.payoutsEnabled) {
                return res.status(400).json({ 
                    error: 'Your Stripe account is not ready for payouts. Please complete any pending requirements.',
                    stripeRequirements: accountStatus.requirements
                });
            }
        } catch (stripeError) {
            return res.status(400).json({ 
                error: 'Unable to verify your Stripe account. Please contact support.',
                stripeError: stripeError.message
            });
        }

        // Calculate payout amount (subtract platform fee)
        const grossAmount = points / POINTS_PER_DOLLAR;
        const platformFee = grossAmount * PLATFORM_FEE_PERCENTAGE;
        const netAmount = grossAmount - platformFee;

        // Validate calculations
        if (isNaN(grossAmount) || isNaN(platformFee) || isNaN(netAmount)) {
            return res.status(400).json({ 
                error: 'Invalid calculation error. Please contact support.',
                debug: { points, grossAmount, platformFee, netAmount, POINTS_PER_DOLLAR, PLATFORM_FEE_PERCENTAGE }
            });
        }

        // Ensure minimum cashout amount after fees
        if (netAmount < 1.00) {
            return res.status(400).json({ 
                error: `Net amount after fees ($${netAmount.toFixed(2)}) is too low. Minimum is $1.00.` 
            });
        }

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
            amount: parseFloat(netAmount.toFixed(2)), // Ensure amount field matches netAmount
            status: 'PENDING',
            requestedAt: new Date().toISOString(),
            requestedBy: userId,
            stripeAccountId: user.stripeAccountId,
            paymentMethod: 'stripe_connect',
            isTestMode
        };

        // Deduct points from user immediately (they'll be restored if request is rejected)
        const userCurrentPoints = user.points || 0;
        const remainingPoints = userCurrentPoints - points;
        
        if (remainingPoints < 0) {
            return res.status(400).json({ error: 'Insufficient points' });
        }

        await db.ref(`users/${userId}`).update({
            points: remainingPoints,
            lastPointsUpdate: new Date().toISOString()
        });

        await cashoutRef.set(cashoutRequest);

        await logPaymentActivity(userId, 'CASHOUT_REQUESTED',
            `Cashout requested: ${points} points ($${netAmount.toFixed(2)} after fees) - ${isTestMode ? 'TEST' : 'LIVE'} MODE`, cashoutId);

        // Notify admins
        const usersSnap = await db.ref('users').once('value');
        const users = usersSnap.val() || {};
        for (const [uid, userData] of Object.entries(users)) {
            if (userData.role === 'admin') {
                try {
                    await createNotification({
                        userId: uid,
                        title: `Cashout Request ${isTestMode ? '(Test Mode)' : ''}`,
                        message: `${user.name || 'User'} requested cashout of ${points} points ($${netAmount.toFixed(2)})${isTestMode ? ' - TEST MODE' : ''}`,
                        type: 'cashout',
                        relatedResource: { cashoutId }
                    });
                } catch (notifErr) {
                    console.error('Failed to notify admin:', notifErr);
                }
            }
        }

        res.status(201).json({
            message: `Cashout request submitted successfully${isTestMode ? ' (TEST MODE)' : ''}.`,
            cashoutId,
            netAmount: netAmount.toFixed(2),
            platformFee: platformFee.toFixed(2),
            status: 'PENDING',
            isTestMode,
            note: isTestMode ? 'This is a test cashout using Stripe test mode.' : 'This is a real cashout request.'
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
            // Restore points to user since they were deducted when the request was created
            const userRef = db.ref(`users/${cashout.userId}`);
            const userSnap = await userRef.once('value');

            if (userSnap.exists()) {
                const user = userSnap.val();
                const currentPoints = user.points || 0;
                const restoredPoints = currentPoints + cashout.points;

                await userRef.update({
                    points: restoredPoints,
                    lastPointsUpdate: new Date().toISOString()
                });

                // Log the points restoration
                await logPaymentActivity(cashout.userId, 'POINTS_RESTORED',
                    `Points restored from rejected cashout: ${cashout.points} points`, cashoutId);
            }

            await cashoutRef.update({
                status: 'REJECTED',
                processedAt: new Date().toISOString(),
                processedBy: req.user.uid,
                adminNotes: adminNotes || 'No reason provided',
                isTestMode
            });

            await logPaymentActivity(cashout.userId, 'CASHOUT_REJECTED',
                `Cashout rejected by admin: ${adminNotes}. Points restored.`, cashoutId);

            // Notify user
            await createNotification({
                userId: cashout.userId,
                title: 'Cashout Rejected',
                message: `Your cashout request for ${cashout.points} points was rejected. Your points have been restored. ${adminNotes || ''}`,
                type: 'cashout'
            });

            return res.json({ 
                message: 'Cashout request rejected and points restored to user',
                pointsRestored: cashout.points
            });
        }

        // Approve cashout - perform the actual transfer
        const userRef = db.ref(`users/${cashout.userId}`);
        const userSnap = await userRef.once('value');

        if (!userSnap.exists()) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userSnap.val();
        const currentPoints = user.points || 0;

        // Note: Points were already deducted when the request was created, so we don't need to check/deduct again

        try {
            // Always use platform balance for transfers
            const balance = await stripe.balance.retrieve();
            const availableBalance = balance.available.find(b => b.currency === STRIPE_CONFIG.CURRENCY);
            const requiredAmount = Math.round(cashout.netAmount * 100); // Convert to cents

            if (!availableBalance || availableBalance.amount < requiredAmount) {
                // Check if this is likely the 7-day payout delay issue
                const pendingBalance = balance.pending.find(b => b.currency === STRIPE_CONFIG.CURRENCY);
                const pendingAmount = (pendingBalance?.amount || 0) / 100;
                const availableAmount = (availableBalance?.amount || 0) / 100;

                let errorMessage = 'Insufficient platform balance for this cashout';
                let suggestion = isTestMode ? 'Add funds using the simulate revenue endpoint' : 'Platform needs more funds';

                if (isTestMode && pendingAmount > 0 && availableAmount === 0) {
                    errorMessage = 'Stripe 7-Day Payout Delay: Funds are pending due to new account waiting period';
                    suggestion = 'You can wait for the 7-day period to end, or add more funds to the available balance for immediate testing.';
                } else if (availableAmount < MIN_BALANCE_THRESHOLD) {
                    await logPaymentActivity('platform', 'LOW_BALANCE_DETECTED',
                        `Platform balance (${availableAmount}) below threshold ($${MIN_BALANCE_THRESHOLD / 100}). Consider adding funds.`);
                }
                
                return res.status(400).json({ 
                    error: errorMessage,
                    requiredAmount: requiredAmount / 100,
                    availableBalance: availableAmount,
                    pendingBalance: pendingAmount,
                    suggestion: suggestion,
                    isTestMode: isTestMode,
                    stripeInfo: isTestMode && pendingAmount > 0 ? 'New Stripe accounts have a 7-day waiting period for first payouts, even in test mode.' : undefined
                });
            }

            // Create the transfer using platform balance
            const transfer = await stripe.transfers.create({
                amount: requiredAmount,
                currency: STRIPE_CONFIG.CURRENCY,
                destination: cashout.stripeAccountId,
                description: `FixMate points cashout - ${cashout.points} points (${isTestMode ? 'TEST' : 'LIVE'})`,
                metadata: {
                    cashoutId,
                    userId: cashout.userId,
                    pointsAmount: cashout.points.toString(),
                    platformFee: (cashout.platformFee * 100).toString(),
                    environment: isTestMode ? 'test' : 'live',
                    source: 'platform-balance'
                }
            });

            // Create points transaction record
            const transactionRef = db.ref('pointsTransactions').push();
            const transactionId = transactionRef.key;

            const transaction = {
                userId: cashout.userId,
                type: 'CASHOUT',
                points: -cashout.points,
                reason: `Points cashout ${isTestMode ? '(test mode)' : ''}`,
                relatedResource: { cashoutId, stripeTransferId: transfer.id },
                timestamp: new Date().toISOString(),
                status: 'COMPLETED',
                previousBalance: currentPoints + cashout.points, // Since points were already deducted
                newBalance: currentPoints, // Current balance is already correct
                isTestMode
            };

            await transactionRef.set(transaction);

            // Points were already deducted when request was created, so no need to update user points again

            // Update cashout request
            await cashoutRef.update({
                status: 'COMPLETED',
                processedAt: new Date().toISOString(),
                processedBy: req.user.uid,
                stripeTransferId: transfer.id,
                transactionId,
                adminNotes,
                isTestMode
            });

            await logPaymentActivity(cashout.userId, 'CASHOUT_COMPLETED',
                `Cashout completed: ${cashout.points} points ($${cashout.netAmount}) transferred via Stripe transfer ${transfer.id}`, transactionId);

            // Notify user
            await createNotification({
                userId: cashout.userId,
                title: `Cashout Processed ${isTestMode ? '(Test Mode)' : ''}`,
                message: `Your cashout of ${cashout.points} points ($${cashout.netAmount}) has been processed and sent to your account.${isTestMode ? ' This is a test transaction.' : ''}`,
                type: 'cashout'
            });

            res.json({
                message: 'Cashout processed successfully',
                transferId: transfer.id,
                transactionId,
                amount: cashout.netAmount,
                isTestMode,
                note: isTestMode ? 'Test transfer completed - no real money moved' : 'Real transfer completed'
            });

        } catch (stripeError) {
            console.error('Stripe transfer error:', stripeError);
            
            // Update cashout request with failure
            await cashoutRef.update({
                status: 'FAILED',
                processedAt: new Date().toISOString(),
                processedBy: req.user.uid,
                failureReason: stripeError.message,
                adminNotes: adminNotes || '',
                isTestMode
            });

            await logPaymentActivity(cashout.userId, 'CASHOUT_FAILED',
                `Cashout failed: ${stripeError.message}`, cashoutId);

            // Notify user of failure
            await createNotification({
                userId: cashout.userId,
                title: 'Cashout Failed',
                message: `Your cashout request failed. Please contact support. Reason: ${stripeError.message}`,
                type: 'cashout'
            });

            res.status(500).json({ 
                error: 'Transfer failed',
                stripeError: stripeError.message,
                cashoutId 
            });
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

        res.json({
            cashouts,
            isTestMode
        });
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

        res.json({
            transactions,
            isTestMode
        });
    } catch (error) {
        console.error('Error fetching points history:', error);
        res.status(500).json({ error: 'Failed to fetch points history' });
    }
};

// Webhook handler for Stripe events
exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_CONFIG.WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`Received webhook event: ${event.type}`);

    try {
        switch (event.type) {
            case 'account.updated':
                await handleAccountUpdated(event.data.object);
                break;
            
            case 'transfer.created':
                await handleTransferCreated(event.data.object);
                break;
            
            case 'transfer.updated':
                await handleTransferUpdated(event.data.object);
                break;
            
            case 'transfer.failed':
                await handleTransferFailed(event.data.object);
                break;
            
            case 'balance.available':
                await handleBalanceUpdate(event.data.object);
                break;
            
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).json({ error: 'Webhook handling failed' });
    }
};

// Webhook handlers
const handleAccountUpdated = async (account) => {
    try {
        // Find user with this Stripe account ID
        const usersSnap = await db.ref('users').orderByChild('stripeAccountId').equalTo(account.id).once('value');
        
        if (!usersSnap.exists()) {
            console.log(`No user found for Stripe account: ${account.id}`);
            return;
        }

        usersSnap.forEach(async (child) => {
            const userId = child.key;
            const onboardingComplete = account.details_submitted && 
                                     account.charges_enabled && 
                                     account.payouts_enabled;

            await db.ref(`users/${userId}`).update({
                stripeOnboardingComplete: onboardingComplete,
                stripeChargesEnabled: account.charges_enabled,
                stripePayoutsEnabled: account.payouts_enabled,
                lastOnboardingCheck: new Date().toISOString()
            });

            await logPaymentActivity(userId, 'ACCOUNT_UPDATED_VIA_WEBHOOK',
                `Stripe account updated: onboarding complete = ${onboardingComplete}`);

            // Notify user if onboarding just completed
            if (onboardingComplete) {
                await createNotification({
                    userId,
                    title: 'Account Setup Complete!',
                    message: 'Your payment account has been successfully set up. You can now request cashouts.',
                    type: 'account'
                });
            }
        });
    } catch (error) {
        console.error('Error handling account update webhook:', error);
    }
};

const handleTransferCreated = async (transfer) => {
    await logPaymentActivity('platform', 'TRANSFER_CREATED_WEBHOOK',
        `Transfer created: ${transfer.id} for $${transfer.amount / 100}`);
};

const handleTransferUpdated = async (transfer) => {
    // Update any relevant cashout requests
    const cashoutId = transfer.metadata?.cashoutId;
    if (cashoutId) {
        await db.ref(`cashoutRequests/${cashoutId}`).update({
            stripeTransferStatus: transfer.status,
            lastStatusUpdate: new Date().toISOString()
        });
    }

    await logPaymentActivity('platform', 'TRANSFER_UPDATED_WEBHOOK',
        `Transfer updated: ${transfer.id} status = ${transfer.status}`);
};

const handleTransferFailed = async (transfer) => {
    const cashoutId = transfer.metadata?.cashoutId;
    const userId = transfer.metadata?.userId;

    if (cashoutId) {
        await db.ref(`cashoutRequests/${cashoutId}`).update({
            status: 'FAILED',
            stripeTransferStatus: 'failed',
            failureReason: 'Transfer failed via webhook',
            lastStatusUpdate: new Date().toISOString()
        });

        if (userId) {
            await createNotification({
                userId,
                title: 'Cashout Failed',
                message: 'Your recent cashout transfer failed. Please contact support for assistance.',
                type: 'cashout'
            });
        }
    }

    await logPaymentActivity(userId || 'platform', 'TRANSFER_FAILED_WEBHOOK',
        `Transfer failed: ${transfer.id}`);
};

const handleBalanceUpdate = async (balance) => {
    const usdBalance = balance.available?.find(b => b.currency === 'usd');
    
    if (usdBalance && usdBalance.amount < MIN_BALANCE_THRESHOLD) {
        await logPaymentActivity('platform', 'LOW_BALANCE_WEBHOOK',
            `Platform balance low: $${usdBalance.amount / 100} (threshold: $${MIN_BALANCE_THRESHOLD / 100})`);
        
        // Notify admins of low balance
        const usersSnap = await db.ref('users').orderByChild('role').equalTo('admin').once('value');
        usersSnap.forEach(async (child) => {
            const adminId = child.key;
            await createNotification({
                userId: adminId,
                title: 'Low Platform Balance Warning',
                message: `Platform balance is low: $${usdBalance.amount / 100}. Consider adding funds to process cashouts.`,
                type: 'admin'
            });
        });
    }
};

// Check platform balance and make funds available for cashouts (Admin only)
exports.createFixMateAccount = async (req, res) => {
    try {
        // Check current platform balance
        const balance = await stripe.balance.retrieve();
        const pendingBalance = balance.pending.find(b => b.currency === STRIPE_CONFIG.CURRENCY);
        const availableBalance = balance.available.find(b => b.currency === STRIPE_CONFIG.CURRENCY);
        
        const pendingAmount = (pendingBalance?.amount || 0) / 100;
        const availableAmount = (availableBalance?.amount || 0) / 100;

        // Save platform balance info in settings for tracking
        await db.ref('settings/fixmateAccount').set({
            type: 'platform-balance',
            availableBalance: availableAmount,
            pendingBalance: pendingAmount,
            lastChecked: new Date().toISOString(),
            onboardingComplete: true, // Platform account is always ready
            purpose: 'Use existing platform balance for cashout processing',
            isTestMode
        });

        await logPaymentActivity('platform', 'PLATFORM_BALANCE_CHECK',
            `Platform balance status - Available: $${availableAmount}, Pending: $${pendingAmount}`);

        res.json({
            message: 'Platform balance configured for cashout processing',
            availableBalance: availableAmount,
            pendingBalance: pendingAmount,
            onboardingComplete: true,
            canProcessCashouts: availableAmount > 0,
            note: pendingAmount > 0 ? 
                'You have pending funds that will become available after the 7-day waiting period. Available funds can be used immediately.' :
                'Platform balance is ready for cashout processing'
        });
    } catch (error) {
        console.error('Error checking platform balance:', error);
        res.status(500).json({ error: 'Failed to check platform balance' });
    }
};

// Platform balance management - no onboarding needed (Admin only)
exports.startFixMateOnboarding = async (req, res) => {
    try {
        // Platform balance doesn't need onboarding
        res.json({
            message: 'Platform balance is ready - no onboarding required',
            onboardingUrl: null,
            note: 'Platform balance can be used directly for cashout processing'
        });
    } catch (error) {
        console.error('Error with platform balance:', error);
        res.status(500).json({ error: 'Failed to access platform balance' });
    }
};

// Check platform balance status (Admin only)
exports.checkFixMateAccountStatus = async (req, res) => {
    try {
        // Get current platform balance
        const balance = await stripe.balance.retrieve();
        const pendingBalance = balance.pending.find(b => b.currency === STRIPE_CONFIG.CURRENCY);
        const availableBalance = balance.available.find(b => b.currency === STRIPE_CONFIG.CURRENCY);
        
        const pendingAmount = (pendingBalance?.amount || 0) / 100;
        const availableAmount = (availableBalance?.amount || 0) / 100;

        // Update settings with current balance
        await db.ref('settings/fixmateAccount').update({
            availableBalance: availableAmount,
            pendingBalance: pendingAmount,
            lastChecked: new Date().toISOString()
        });

        res.json({
            exists: true,
            type: 'platform-balance',
            onboardingComplete: true,
            canProcessCashouts: availableAmount > 0,
            availableBalance: availableAmount,
            pendingBalance: pendingAmount,
            totalBalance: availableAmount + pendingAmount,
            note: 'Using existing platform balance for cashout processing',
            pendingNote: pendingAmount > 0 ? 
                `$${pendingAmount} will become available after the 7-day waiting period` : 
                'No pending funds'
        });
    } catch (error) {
        console.error('Error checking platform balance status:', error);
        res.status(500).json({ error: 'Failed to check platform balance status' });
    }
};

// Platform balance is automatically funded - no manual fund addition needed (Test mode only)
exports.addFundsToFixMateAccount = async (req, res) => {
    try {
        if (!isTestMode) {
            return res.status(400).json({ error: 'This endpoint is only available in test mode' });
        }

        // Use the existing simulate revenue function to add funds to platform
        const { amount = 50000 } = req.body; // Default $500 in cents
        
        const charge = await stripe.charges.create({
            amount: amount,
            currency: STRIPE_CONFIG.CURRENCY,
            source: STRIPE_CONFIG.TEST_TOKENS.VISA,
            description: 'Test funds added to platform balance for cashout processing'
        });

        await logPaymentActivity('platform', 'FUNDS_ADDED_TO_PLATFORM',
            `Added $${amount / 100} to platform balance for testing`, charge.id);

        // Get updated balance
        const balance = await stripe.balance.retrieve();
        const pendingBalance = balance.pending.find(b => b.currency === STRIPE_CONFIG.CURRENCY);
        const availableBalance = balance.available.find(b => b.currency === STRIPE_CONFIG.CURRENCY);

        res.json({
            message: `Successfully added $${amount / 100} to platform balance`,
            chargeId: charge.id,
            amount: amount / 100,
            availableBalance: (availableBalance?.amount || 0) / 100,
            pendingBalance: (pendingBalance?.amount || 0) / 100,
            note: 'These are test funds for processing cashouts using platform balance'
        });
    } catch (error) {
        console.error('Error adding funds to platform balance:', error);
        res.status(500).json({ error: 'Failed to add funds to platform balance' });
    }
};

// Legacy endpoint compatibility
exports.getPoints = exports.getUserPoints;

// ADMIN FUNCTIONS FOR STRIPE ACCOUNT MANAGEMENT

// Get all users with their Stripe account information (Admin only)
exports.getAllUsersWithStripeAccounts = async (req, res) => {
    try {
        const usersSnap = await db.ref('users').once('value');
        const users = usersSnap.val() || {};
        
        const usersWithStripeInfo = [];
        
        for (const [userId, userData] of Object.entries(users)) {
            const userInfo = {
                uid: userId,
                name: userData.name || 'Unknown',
                email: userData.email,
                role: userData.role,
                points: userData.points || 0,
                stripeAccountId: userData.stripeAccountId || null,
                stripeOnboardingComplete: userData.stripeOnboardingComplete || false,
                stripeAccountCreated: userData.stripeAccountCreated || null,
                lastOnboardingCheck: userData.lastOnboardingCheck || null
            };

            // If user has a Stripe account, get additional details
            if (userData.stripeAccountId) {
                try {
                    const accountStatus = await checkAccountOnboarding(userData.stripeAccountId, userId);
                    userInfo.stripeAccountStatus = accountStatus;
                } catch (error) {
                    console.error(`Error checking Stripe account for user ${userId}:`, error);
                    userInfo.stripeAccountStatus = { error: error.message };
                }
            }

            usersWithStripeInfo.push(userInfo);
        }

        res.json({
            users: usersWithStripeInfo,
            totalUsers: usersWithStripeInfo.length,
            usersWithStripeAccounts: usersWithStripeInfo.filter(u => u.stripeAccountId).length
        });
    } catch (error) {
        console.error('Error fetching users with Stripe accounts:', error);
        res.status(500).json({ error: 'Failed to fetch users with Stripe accounts' });
    }
};

// Get all cashout requests (Admin only)
exports.getAllCashoutRequests = async (req, res) => {
    try {
        const { status } = req.query; // Optional filter by status
        
        const cashoutSnap = await db.ref('cashoutRequests').once('value');
        const cashoutRequests = [];

        cashoutSnap.forEach(child => {
            const cashout = {
                id: child.key,
                ...child.val()
            };
            
            // Filter by status if provided
            if (!status || cashout.status === status) {
                cashoutRequests.push(cashout);
            }
        });

        // Sort by request date (most recent first)
        cashoutRequests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

        res.json({
            cashoutRequests,
            totalRequests: cashoutRequests.length,
            pendingRequests: cashoutRequests.filter(r => r.status === 'PENDING').length,
            completedRequests: cashoutRequests.filter(r => r.status === 'COMPLETED').length,
            failedRequests: cashoutRequests.filter(r => r.status === 'FAILED').length,
            rejectedRequests: cashoutRequests.filter(r => r.status === 'REJECTED').length
        });
    } catch (error) {
        console.error('Error fetching all cashout requests:', error);
        res.status(500).json({ error: 'Failed to fetch cashout requests' });
    }
};

// Delete Stripe account (Admin only)
exports.deleteStripeAccount = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const userSnap = await db.ref(`users/${userId}`).once('value');
        if (!userSnap.exists()) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userSnap.val();
        
        if (!user.stripeAccountId) {
            return res.status(400).json({ error: 'User does not have a Stripe account' });
        }

        // Check if user has pending cashout requests
        const pendingCashouts = await db.ref('cashoutRequests')
            .orderByChild('userId')
            .equalTo(userId)
            .once('value');
        
        let hasPendingCashouts = false;
        pendingCashouts.forEach(child => {
            const cashout = child.val();
            if (cashout.status === 'PENDING') {
                hasPendingCashouts = true;
            }
        });

        if (hasPendingCashouts) {
            return res.status(400).json({ 
                error: 'Cannot delete Stripe account with pending cashout requests. Please process or reject pending requests first.' 
            });
        }

        try {
            // Delete the Stripe account
            await stripe.accounts.del(user.stripeAccountId);
            
            // Update user record
            await db.ref(`users/${userId}`).update({
                stripeAccountId: null,
                stripeOnboardingComplete: false,
                stripeChargesEnabled: false,
                stripePayoutsEnabled: false,
                stripeAccountDeleted: new Date().toISOString(),
                deletedBy: req.user.uid
            });

            await logPaymentActivity(userId, 'STRIPE_ACCOUNT_DELETED',
                `Stripe account ${user.stripeAccountId} deleted by admin ${req.user.uid}`);

            // Notify user
            await createNotification({
                userId,
                title: 'Payment Account Removed',
                message: 'Your payment account has been removed by an administrator. You will need to set up a new account to request cashouts.',
                type: 'account'
            });

            res.json({
                message: 'Stripe account deleted successfully',
                deletedAccountId: user.stripeAccountId
            });

        } catch (stripeError) {
            // Even if Stripe deletion fails, clear the local reference
            await db.ref(`users/${userId}`).update({
                stripeAccountId: null,
                stripeOnboardingComplete: false,
                stripeChargesEnabled: false,
                stripePayoutsEnabled: false,
                stripeAccountDeleted: new Date().toISOString(),
                deletedBy: req.user.uid,
                deletionNote: `Stripe deletion failed: ${stripeError.message}`
            });

            await logPaymentActivity(userId, 'STRIPE_ACCOUNT_DELETION_FAILED',
                `Failed to delete Stripe account ${user.stripeAccountId}: ${stripeError.message}. Local reference cleared.`);

            res.json({
                message: 'Local Stripe account reference cleared (Stripe deletion may have failed)',
                warning: stripeError.message,
                deletedAccountId: user.stripeAccountId
            });
        }

    } catch (error) {
        console.error('Error deleting Stripe account:', error);
        res.status(500).json({ error: 'Failed to delete Stripe account' });
    }
};

// Get platform balance and statistics (Admin only)
exports.getPlatformStatistics = async (req, res) => {
    try {
        // Get Stripe balance
        const balance = await stripe.balance.retrieve();
        const usdBalance = balance.available.find(b => b.currency === 'usd') || { amount: 0 };
        const pendingBalance = balance.pending.find(b => b.currency === 'usd') || { amount: 0 };

        // Get cashout statistics
        const cashoutSnap = await db.ref('cashoutRequests').once('value');
        const cashouts = [];
        cashoutSnap.forEach(child => {
            cashouts.push(child.val());
        });

        const totalCashoutAmount = cashouts
            .filter(c => c.status === 'COMPLETED')
            .reduce((sum, c) => sum + (c.netAmount || 0), 0);

        const totalPlatformFees = cashouts
            .filter(c => c.status === 'COMPLETED')
            .reduce((sum, c) => sum + (c.platformFee || 0), 0);

        // Get user statistics
        const usersSnap = await db.ref('users').once('value');
        const users = usersSnap.val() || {};
        
        const userStats = {
            totalUsers: Object.keys(users).length,
            usersWithStripeAccounts: Object.values(users).filter(u => u.stripeAccountId).length,
            usersWithCompleteOnboarding: Object.values(users).filter(u => u.stripeOnboardingComplete).length
        };

        res.json({
            platformBalance: {
                available: usdBalance.amount / 100,
                pending: pendingBalance.amount / 100,
                currency: 'usd',
                lastUpdated: new Date().toISOString()
            },
            cashoutStatistics: {
                totalRequests: cashouts.length,
                pendingRequests: cashouts.filter(c => c.status === 'PENDING').length,
                completedRequests: cashouts.filter(c => c.status === 'COMPLETED').length,
                failedRequests: cashouts.filter(c => c.status === 'FAILED').length,
                rejectedRequests: cashouts.filter(c => c.status === 'REJECTED').length,
                totalAmountPaidOut: totalCashoutAmount,
                totalPlatformFeesCollected: totalPlatformFees
            },
            userStatistics: userStats,
            isTestMode
        });
    } catch (error) {
        console.error('Error fetching platform statistics:', error);
        res.status(500).json({ error: 'Failed to fetch platform statistics' });
    }
};

// Delete cashout request (Admin only)
exports.deleteCashoutRequest = async (req, res) => {
    try {
        const { cashoutId } = req.params;

        const cashoutRef = db.ref(`cashoutRequests/${cashoutId}`);
        const cashoutSnap = await cashoutRef.once('value');

        if (!cashoutSnap.exists()) {
            return res.status(404).json({ error: 'Cashout request not found' });
        }

        const cashout = cashoutSnap.val();

        // Only allow deletion of PENDING or REJECTED requests
        if (!['PENDING', 'REJECTED'].includes(cashout.status)) {
            return res.status(400).json({ 
                error: 'Cannot delete cashout request that has been approved or is being processed' 
            });
        }

        // If it's a pending request, we need to restore the user's points
        if (cashout.status === 'PENDING') {
            const userRef = db.ref(`users/${cashout.userId}`);
            const userSnap = await userRef.once('value');

            if (userSnap.exists()) {
                const user = userSnap.val();
                const currentPoints = user.points || 0;
                const restoredPoints = currentPoints + cashout.points;

                await userRef.update({
                    points: restoredPoints,
                    lastPointsUpdate: new Date().toISOString()
                });

                // Log the points restoration
                await logPaymentActivity(cashout.userId, 'POINTS_RESTORED',
                    `Points restored from deleted cashout request: ${cashout.points} points`, cashoutId);
            }
        }

        // Delete the cashout request
        await cashoutRef.remove();

        await logPaymentActivity(req.user.uid, 'CASHOUT_DELETED',
            `Deleted cashout request ${cashoutId} (Status: ${cashout.status}, Amount: $${cashout.netAmount})`, cashoutId);

        // Notify the user
        try {
            await createNotification({
                userId: cashout.userId,
                title: 'Cashout Request Deleted',
                message: `Your cashout request for ${cashout.points} points has been deleted by an administrator.${cashout.status === 'PENDING' ? ' Your points have been restored.' : ''}`,
                type: 'cashout'
            });
        } catch (notifErr) {
            console.error('Failed to notify user about deletion:', notifErr);
        }

        res.json({ 
            message: 'Cashout request deleted successfully',
            pointsRestored: cashout.status === 'PENDING' ? cashout.points : 0
        });
    } catch (error) {
        console.error('Error deleting cashout request:', error);
        res.status(500).json({ error: 'Failed to delete cashout request' });
    }
};
