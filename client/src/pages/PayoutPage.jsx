import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Paper,
    Alert,
} from '@mui/material';
import AppLayout from '../components/AppLayout';
import axios from 'axios';
import { getAuth } from 'firebase/auth'; // assuming firebase is set up

export default function PayoutPage() {
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(null);
    const [message, setMessage] = useState('');
    const [payoutLoading, setPayoutLoading] = useState(false);
    const [creatingAccount, setCreatingAccount] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
            setMessage('You must be logged in.');
            setLoading(false);
            return;
        }

        setUser(currentUser);

        const fetchBalance = async () => {
            try {
                // Send Firebase ID token in Authorization header for backend auth
                const idToken = await currentUser.getIdToken();
                const res = await axios.get('/api/stripe/balance', {
                    headers: { Authorization: `Bearer ${idToken}` },
                });
                setBalance(res.data.available);
            } catch (error) {
                console.error('Error fetching balance:', error);
                setMessage('Failed to load balance.');
            } finally {
                setLoading(false);
            }
        };

        fetchBalance();
    }, []);

    const handleCreateConnectedAccount = async () => {
        if (!user) return;
        setCreatingAccount(true);
        try {
            const idToken = await user.getIdToken();
            const res = await axios.post(
                '/api/stripe/create-connected-account',
                { email: user.email, uid: user.uid },
                { headers: { Authorization: `Bearer ${idToken}` } }
            );
            window.location.href = res.data.url; // redirect user to Stripe onboarding
        } catch (error) {
            console.error('Error creating connected account:', error);
            setMessage('Failed to create Stripe account.');
            setCreatingAccount(false);
        }
    };

    const handlePayout = async () => {
        setPayoutLoading(true);
        try {
            const idToken = await user.getIdToken();
            await axios.post(
                '/api/stripe/payout',
                {},
                { headers: { Authorization: `Bearer ${idToken}` } }
            );
            setMessage('Payout requested successfully.');
        } catch (error) {
            console.error(error);
            setMessage('Failed to create payout.');
        } finally {
            setPayoutLoading(false);
        }
    };

    return (
        <AppLayout activeItem="Withdraw">
            <Box sx={{ mt: 4, px: { xs: 2, sm: 4, md: 6 }, width: '100%' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                    Withdraw Funds
                </Typography>

                {message && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        {message}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{ textAlign: 'center', mt: 10 }}>
                        <CircularProgress />
                    </Box>
                ) : !balance ? (
                    // If user has no connected account yet, show button to create one
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleCreateConnectedAccount}
                        disabled={creatingAccount}
                    >
                        {creatingAccount ? 'Creating Account...' : 'Create Stripe Account'}
                    </Button>
                ) : (
                    <Paper elevation={3} sx={{ borderRadius: 3, p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Available Balance:
                        </Typography>
                        <Typography variant="h4" sx={{ mb: 3 }}>
                            ${balance?.[0]?.amount / 100 || 0} USD
                        </Typography>

                        <Button
                            variant="contained"
                            color="primary"
                            disabled={payoutLoading || (balance?.[0]?.amount || 0) <= 0}
                            onClick={handlePayout}
                        >
                            {payoutLoading ? 'Processing...' : 'Withdraw Funds'}
                        </Button>
                    </Paper>
                )}
            </Box>
        </AppLayout>
    );
}
