import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Card, CardContent, TextField, Grid, Paper,
    Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, Alert, Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AppLayout from '../components/AppLayout';
import { useSnackbar } from '../components/FeedbackSnackbar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import api from '../api/ApiClient';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HistoryIcon from '@mui/icons-material/History';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

export default function CashoutPage() {
    const { showSnackbar } = useSnackbar();
    const [user] = useAuthState(auth);
    const theme = useTheme();

    const [loading, setLoading] = useState(true);
    const [pointsData, setPointsData] = useState({});
    const [cashoutAmount, setCashoutAmount] = useState('');
    const [cashoutHistory, setCashoutHistory] = useState([]);
    const [pointsHistory, setPointsHistory] = useState([]);
    const [cashoutDialogOpen, setCashoutDialogOpen] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [submittingCashout, setSubmittingCashout] = useState(false);
    const [permissions, setPermissions] = useState({});

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch user permissions
            const permRes = await api.get(`/users/${user.uid}/permissions`);
            setPermissions(permRes.data);

            // Fetch points data
            const pointsRes = await api.get(`/payments/points/${user.uid}`, {
                meta: { permission: 'viewPoints' }
            });
            setPointsData(pointsRes.data);

            // Fetch cashout history
            const cashoutRes = await api.get('/payments/cashout-history', {
                meta: { permission: 'viewCashoutHistory' }
            });
            setCashoutHistory(cashoutRes.data);

            // Fetch points history
            const historyRes = await api.get('/payments/points-history', {
                meta: { permission: 'viewPointsHistory' }
            });
            setPointsHistory(historyRes.data);

        } catch (error) {
            console.error('Error fetching cashout data:', error);
            showSnackbar('Failed to load cashout data', 'error');
        }
        setLoading(false);
    };

    const handleCashoutRequest = async () => {
        if (!cashoutAmount || cashoutAmount < pointsData.minCashoutPoints) {
            showSnackbar(`Minimum cashout is ${pointsData.minCashoutPoints} points`, 'warning');
            return;
        }

        if (cashoutAmount > pointsData.points) {
            showSnackbar('Insufficient points', 'warning');
            return;
        }

        setSubmittingCashout(true);
        try {
            await api.post('/payments/cashout',
                { points: parseInt(cashoutAmount) },
                { meta: { permission: 'requestCashout' } }
            );

            showSnackbar('Cashout request submitted successfully!', 'success');
            setCashoutDialogOpen(false);
            setCashoutAmount('');
            await fetchData(); // Refresh data
        } catch (error) {
            console.error('Error requesting cashout:', error);
            showSnackbar('Failed to submit cashout request', 'error');
        }
        setSubmittingCashout(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'success';
            case 'PENDING': return 'warning';
            case 'REJECTED': return 'error';
            case 'FAILED': return 'error';
            default: return 'default';
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <AppLayout activeItem="Cashout" title="Points & Cashout">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <CircularProgress />
                </Box>
            </AppLayout>
        );
    }

    if (!permissions.can_requestCashout && !permissions.can_processCashout) {
        return (
            <AppLayout activeItem="Cashout" title="Points & Cashout">
                <Alert severity="info">
                    You don't have permission to access the cashout system. Only Technicians, Leads, and Admins can view this page.
                </Alert>
            </AppLayout>
        );
    }

    return (
        <AppLayout activeItem="Cashout" title="Points & Cashout">
            <Grid container spacing={3}>
                {/* Points Balance Card */}
                <Grid item xs={12} md={6}>
                    <Card elevation={3}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <AccountBalanceWalletIcon sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="h6">Points Balance</Typography>
                            </Box>
                            <Typography variant="h3" color="primary" sx={{ mb: 1 }}>
                                {pointsData.points || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                ≈ ${pointsData.dollarValue || '0.00'} USD
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            {permissions.can_requestCashout && (
                                <Box>
                                    <Button
                                        variant="contained"
                                        startIcon={<AttachMoneyIcon />}
                                        onClick={() => setCashoutDialogOpen(true)}
                                        disabled={!pointsData.canCashout}
                                        fullWidth
                                        sx={{ mb: 1 }}
                                    >
                                        Request Cashout
                                    </Button>
                                    {!pointsData.canCashout && (
                                        <Typography variant="caption" color="text.secondary">
                                            Minimum {pointsData.minCashoutPoints} points required
                                        </Typography>
                                    )}
                                </Box>
                            )}

                            <Button
                                variant="outlined"
                                startIcon={<HistoryIcon />}
                                onClick={() => setHistoryDialogOpen(true)}
                                fullWidth
                                sx={{ mt: 1 }}
                            >
                                View History
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Cashouts */}
                <Grid item xs={12} md={6}>
                    <Card elevation={3}>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Recent Cashout Requests</Typography>
                            {cashoutHistory.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    No cashout requests yet
                                </Typography>
                            ) : (
                                <Box>
                                    {cashoutHistory.slice(0, 3).map((cashout) => (
                                        <Paper key={cashout.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box>
                                                    <Typography variant="body2">
                                                        {cashout.points} points → ${cashout.netAmount}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {formatDate(cashout.requestedAt)}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label={cashout.status}
                                                    color={getStatusColor(cashout.status)}
                                                    size="small"
                                                />
                                            </Box>
                                        </Paper>
                                    ))}
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Admin Section - Pending Cashouts */}
                {permissions.can_processCashout && (
                    <Grid item xs={12}>
                        <PendingCashoutsSection onRefresh={fetchData} />
                    </Grid>
                )}
            </Grid>

            {/* Cashout Request Dialog */}
            <Dialog open={cashoutDialogOpen} onClose={() => setCashoutDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Request Cashout</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Current balance: {pointsData.points} points (${pointsData.dollarValue})
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label={`Points to cash out (min: ${pointsData.minCashoutPoints})`}
                        type="number"
                        fullWidth
                        variant="outlined"
                        value={cashoutAmount}
                        onChange={(e) => setCashoutAmount(e.target.value)}
                        inputProps={{ min: pointsData.minCashoutPoints, max: pointsData.points }}
                    />
                    {cashoutAmount && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            You will receive approximately ${((cashoutAmount / 100) * 0.97).toFixed(2)} after platform fees (3%)
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCashoutDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleCashoutRequest}
                        variant="contained"
                        disabled={submittingCashout || !cashoutAmount}
                        startIcon={submittingCashout ? <CircularProgress size={20} /> : null}
                    >
                        {submittingCashout ? 'Submitting...' : 'Submit Request'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Points & Cashout History</DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Points History</Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Points</TableCell>
                                        <TableCell>Reason</TableCell>
                                        <TableCell>Balance</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {pointsHistory.slice(0, 10).map((transaction) => (
                                        <TableRow key={transaction.id}>
                                            <TableCell>{formatDate(transaction.timestamp)}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={transaction.type}
                                                    color={transaction.type === 'EARNED' ? 'success' : 'warning'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography color={transaction.points > 0 ? 'success.main' : 'error.main'}>
                                                    {transaction.points > 0 ? '+' : ''}{transaction.points}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{transaction.reason}</TableCell>
                                            <TableCell>{transaction.newBalance}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>

                    <Box>
                        <Typography variant="h6" sx={{ mb: 1 }}>Cashout History</Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Points</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Notes</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {cashoutHistory.map((cashout) => (
                                        <TableRow key={cashout.id}>
                                            <TableCell>{formatDate(cashout.requestedAt)}</TableCell>
                                            <TableCell>{cashout.points}</TableCell>
                                            <TableCell>${cashout.netAmount}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={cashout.status}
                                                    color={getStatusColor(cashout.status)}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>{cashout.adminNotes || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </AppLayout>
    );
}

// Component for admin pending cashouts section
function PendingCashoutsSection({ onRefresh }) {
    const { showSnackbar } = useSnackbar();
    const [pendingCashouts, setPendingCashouts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchPendingCashouts();
    }, []);

    const fetchPendingCashouts = async () => {
        setLoading(true);
        try {
            const response = await api.get('/payments/cashout-history', {
                meta: { permission: 'viewCashoutHistory' }
            });
            setPendingCashouts(response.data.filter(c => c.status === 'PENDING'));
        } catch (error) {
            console.error('Error fetching pending cashouts:', error);
        }
        setLoading(false);
    };

    const processCashout = async (cashoutId, action, notes = '') => {
        setProcessingId(cashoutId);
        try {
            await api.put(`/payments/cashout/${cashoutId}/process`, {
                action,
                adminNotes: notes
            }, {
                meta: { permission: 'processCashout' }
            });

            showSnackbar(`Cashout ${action}d successfully`, 'success');
            await fetchPendingCashouts();
            onRefresh();
        } catch (error) {
            console.error('Error processing cashout:', error);
            showSnackbar('Failed to process cashout', 'error');
        }
        setProcessingId(null);
    };

    return (
        <Card elevation={3}>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Pending Cashout Approvals</Typography>
                {loading ? (
                    <CircularProgress />
                ) : pendingCashouts.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        No pending cashout requests
                    </Typography>
                ) : (
                    <TableContainer component={Paper} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>User</TableCell>
                                    <TableCell>Points</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Requested</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pendingCashouts.map((cashout) => (
                                    <TableRow key={cashout.id}>
                                        <TableCell>{cashout.userName || cashout.userEmail}</TableCell>
                                        <TableCell>{cashout.points}</TableCell>
                                        <TableCell>${cashout.netAmount}</TableCell>
                                        <TableCell>{formatDate(cashout.requestedAt)}</TableCell>
                                        <TableCell>
                                            <Button
                                                size="small"
                                                color="success"
                                                onClick={() => processCashout(cashout.id, 'approve')}
                                                disabled={processingId === cashout.id}
                                                sx={{ mr: 1 }}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                size="small"
                                                color="error"
                                                onClick={() => processCashout(cashout.id, 'reject', 'Rejected by admin')}
                                                disabled={processingId === cashout.id}
                                            >
                                                Reject
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </CardContent>
        </Card>
    );
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
