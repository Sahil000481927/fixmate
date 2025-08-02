import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Card, CardContent, TextField, Grid, Paper,
    Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, Alert, Divider, Stepper, Step, StepLabel, StepContent, useMediaQuery,
    Tabs, Tab, IconButton, Tooltip, MenuItem, Select, FormControl, InputLabel
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
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleIcon from '@mui/icons-material/People';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function CashoutPage() {
    const [user] = useAuthState(auth);
    const { showSnackbar } = useSnackbar();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState({});
    const [pointsData, setPointsData] = useState({});
    const [cashoutAmount, setCashoutAmount] = useState('');
    const [cashoutHistory, setCashoutHistory] = useState([]);
    const [pointsHistory, setPointsHistory] = useState([]);
    const [cashoutDialogOpen, setCashoutDialogOpen] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [submittingCashout, setSubmittingCashout] = useState(false);

    // Stripe Connect states
    const [onboardingStatus, setOnboardingStatus] = useState({});
    const [onboardingLoading, setOnboardingLoading] = useState(false);
    const [revenueSimulating, setRevenueSimulating] = useState(false);

    // Platform Balance states
    const [fixmateAccountStatus, setFixmateAccountStatus] = useState({});
    const [fixmateAccountLoading, setFixmateAccountLoading] = useState(false);

    // Admin-specific states
    const [tabValue, setTabValue] = useState(0);
    const [usersWithStripe, setUsersWithStripe] = useState([]);
    const [allCashouts, setAllCashouts] = useState([]);
    const [platformStats, setPlatformStats] = useState({});
    const [cashoutFilter, setCashoutFilter] = useState('ALL');
    const [userFilter, setUserFilter] = useState('');
    const [processingCashout, setProcessingCashout] = useState(null);
    const [processDialogOpen, setProcessDialogOpen] = useState(false);
    const [deleteAccountDialog, setDeleteAccountDialog] = useState(null);
    const [processingAction, setProcessingAction] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // Fetch user permissions first
            const permRes = await api.get(`/users/${user.uid}/permissions`);
            setPermissions(permRes.data);

            // Fetch points data if user has permission
            if (permRes.data.can_viewPoints) {
                const pointsRes = await api.get(`/payments/points/${user.uid}`, {
                    meta: { permission: 'viewPoints' }
                });
                setPointsData(pointsRes.data);
            }

            // Fetch onboarding status if user can request cashout
            if (permRes.data.can_requestCashout) {
                const onboardingRes = await api.get('/payments/onboarding/status', {
                    meta: { permission: 'requestCashout' }
                });
                setOnboardingStatus(onboardingRes.data);
            }

            // Fetch cashout history if user has permission
            if (permRes.data.can_viewCashoutHistory) {
                const cashoutRes = await api.get('/payments/cashout-history', {
                    meta: { permission: 'viewCashoutHistory' }
                });
                setCashoutHistory(cashoutRes.data.cashouts || []);
            }

            // Fetch points history if user has permission
            if (permRes.data.can_viewPointsHistory) {
                const historyRes = await api.get('/payments/points-history', {
                    meta: { permission: 'viewPointsHistory' }
                });
                setPointsHistory(historyRes.data.transactions || []);
            }

            // Fetch admin data if user has admin permissions
            if (permRes.data.can_admin) {
                await Promise.all([
                    fetchUsersWithStripe(),
                    fetchAllCashouts(),
                    fetchPlatformStats(),
                    fetchFixMateAccountStatus()
                ]);
            }

        } catch (error) {
            console.error('Error fetching cashout data:', error);
            showSnackbar('Failed to load cashout data', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Admin data fetch functions
    const fetchUsersWithStripe = async () => {
        try {
            const response = await api.get('/payments/admin/users-with-stripe', {
                meta: { permission: 'admin' }
            });
            setUsersWithStripe(response.data.users || []);
        } catch (error) {
            console.error('Error fetching users with Stripe:', error);
            throw error;
        }
    };

    const fetchAllCashouts = async () => {
        try {
            const response = await api.get('/payments/admin/all-cashouts', {
                meta: { permission: 'admin' }
            });
            setAllCashouts(response.data.cashoutRequests || []);
        } catch (error) {
            console.error('Error fetching all cashouts:', error);
            throw error;
        }
    };

    const fetchPlatformStats = async () => {
        try {
            const response = await api.get('/payments/admin/platform-stats', {
                meta: { permission: 'admin' }
            });
            setPlatformStats(response.data);
        } catch (error) {
            console.error('Error fetching platform stats:', error);
            throw error;
        }
    };

    // Platform Balance functions
    const fetchFixMateAccountStatus = async () => {
        try {
            const response = await api.get('/payments/admin/fixmate-account/status', {
                meta: { permission: 'admin' }
            });
            setFixmateAccountStatus(response.data);
        } catch (error) {
            console.error('Error fetching platform balance status:', error);
            setFixmateAccountStatus({ exists: false });
        }
    };

    const handleCreateFixMateAccount = async () => {
        if (!permissions.can_admin) {
            showSnackbar('You do not have permission to check platform balance', 'error');
            return;
        }

        setFixmateAccountLoading(true);
        try {
            const response = await api.post('/payments/admin/fixmate-account/create', {}, {
                meta: { permission: 'admin' }
            });
            showSnackbar('Platform balance configured successfully', 'success');
            await fetchFixMateAccountStatus();
        } catch (error) {
            console.error('Error configuring platform balance:', error);
            showSnackbar(error.response?.data?.error || 'Failed to configure platform balance', 'error');
        } finally {
            setFixmateAccountLoading(false);
        }
    };

    const handleFixMateOnboarding = async () => {
        if (!permissions.can_admin) {
            showSnackbar('You do not have permission to start FixMate onboarding', 'error');
            return;
        }

        setFixmateAccountLoading(true);
        try {
            const response = await api.post('/payments/admin/fixmate-account/onboarding', {}, {
                meta: { permission: 'admin' }
            });
            if (response.data.onboardingUrl) {
                window.open(response.data.onboardingUrl, '_blank');
                showSnackbar('FixMate onboarding started. Complete it in the new tab, then refresh this page.', 'info');
            } else {
                showSnackbar(response.data.message, 'info');
            }
        } catch (error) {
            console.error('Error starting FixMate onboarding:', error);
            showSnackbar(error.response?.data?.error || 'Failed to start FixMate onboarding', 'error');
        } finally {
            setFixmateAccountLoading(false);
        }
    };

    const handleAddFundsToFixMate = async () => {
        if (!permissions.can_admin) {
            showSnackbar('You do not have permission to add funds to platform balance', 'error');
            return;
        }

        setFixmateAccountLoading(true);
        try {
            const response = await api.post('/payments/admin/fixmate-account/add-funds', {
                amount: 50000 // $500 in cents
            }, {
                meta: { permission: 'admin' }
            });
            showSnackbar(`Successfully added $${response.data.amount} to platform balance`, 'success');
            await fetchPlatformStats(); // Refresh stats
        } catch (error) {
            console.error('Error adding funds to platform balance:', error);
            showSnackbar(error.response?.data?.error || 'Failed to add funds to platform balance', 'error');
        } finally {
            setFixmateAccountLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchAllData();
        }
    }, [user]);

    // Check for return from onboarding
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === 'true') {
            showSnackbar('Onboarding process completed! Checking account status...', 'success');
            setTimeout(() => {
                fetchAllData();
            }, 2000);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('refresh') === 'true') {
            showSnackbar('Please complete the onboarding process to enable cashouts.', 'info');
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleStartOnboarding = async () => {
        if (!permissions.can_requestCashout) {
            showSnackbar('You do not have permission to request cashouts', 'error');
            return;
        }

        setOnboardingLoading(true);
        try {
            const response = await api.post('/payments/onboarding/start', {}, {
                meta: { permission: 'requestCashout' }
            });
            
            if (response.data.onboardingUrl) {
                window.location.href = response.data.onboardingUrl;
            } else {
                showSnackbar('Failed to create onboarding link', 'error');
            }
        } catch (error) {
            console.error('Error starting onboarding:', error);
            showSnackbar('Failed to start onboarding process', 'error');
        } finally {
            setOnboardingLoading(false);
        }
    };

    const handleRefreshStatus = async () => {
        if (!permissions.can_requestCashout) {
            showSnackbar('You do not have permission to check cashout status', 'error');
            return;
        }

        try {
            // Refresh both onboarding status and points data to ensure consistency
            const [onboardingRes, pointsRes] = await Promise.all([
                api.get('/payments/onboarding/status', {
                    meta: { permission: 'requestCashout' }
                }),
                permissions.can_viewPoints ? api.get(`/payments/points/${user.uid}`, {
                    meta: { permission: 'viewPoints' }
                }) : Promise.resolve({ data: pointsData })
            ]);
            
            setOnboardingStatus(onboardingRes.data);
            if (permissions.can_viewPoints) {
                setPointsData(pointsRes.data);
            }
            
            showSnackbar('Status refreshed', 'success');
        } catch (error) {
            console.error('Error refreshing status:', error);
            showSnackbar('Failed to refresh status', 'error');
        }
    };

    const handleCashoutRequest = async () => {
        if (!permissions.can_requestCashout) {
            showSnackbar('You do not have permission to request cashouts', 'error');
            return;
        }

        const amount = parseFloat(cashoutAmount);
        if (isNaN(amount) || amount <= 0) {
            showSnackbar('Please enter a valid amount', 'error');
            return;
        }

        // Convert dollar amount to points (100 points = $1)
        const points = Math.round(amount * 100);

        setSubmittingCashout(true);
        try {
            await api.post('/payments/cashout', { points }, {
                meta: { permission: 'requestCashout' }
            });
            
            showSnackbar('Cashout request submitted successfully', 'success');
            setCashoutDialogOpen(false);
            setCashoutAmount('');
            await fetchAllData(); // Refresh data
        } catch (error) {
            console.error('Error submitting cashout:', error);
            showSnackbar(error.response?.data?.error || 'Failed to submit cashout request', 'error');
        } finally {
            setSubmittingCashout(false);
        }
    };

    const handleSimulateRevenue = async () => {
        if (!permissions.can_admin) {
            showSnackbar('You do not have permission to simulate revenue', 'error');
            return;
        }

        setRevenueSimulating(true);
        try {
            await api.post('/payments/simulate-revenue', {}, {
                meta: { permission: 'admin' }
            });
            showSnackbar('Platform revenue simulated successfully. Use "Make Funds Available" if needed.', 'success');
        } catch (error) {
            console.error('Error simulating revenue:', error);
            showSnackbar('Failed to simulate revenue', 'error');
        } finally {
            setRevenueSimulating(false);
        }
    };

    const handleMakeFundsAvailable = async () => {
        if (!permissions.can_admin) {
            showSnackbar('You do not have permission to make funds available', 'error');
            return;
        }

        setRevenueSimulating(true); // Reuse the same loading state
        try {
            const response = await api.post('/payments/make-funds-available', {}, {
                meta: { permission: 'admin' }
            });
            showSnackbar(response.data.message || 'Funds made available successfully', 'success');
            // Refresh platform stats to show updated balance
            if (permissions.can_admin) {
                setTimeout(() => {
                    fetchPlatformStats();
                }, 3000); // Wait a bit for Stripe to update
            }
        } catch (error) {
            console.error('Error making funds available:', error);
            showSnackbar(error.response?.data?.error || 'Failed to make funds available', 'error');
        } finally {
            setRevenueSimulating(false);
        }
    };

    // Admin handler functions
    const handleProcessCashout = async (action) => {
        if (!processingCashout || !action) return;

        setProcessingAction(true);
        try {
            const response = await api.put(`/payments/cashout/${processingCashout.id}/process`, {
                action,
                adminNotes
            }, {
                meta: { permission: 'processCashout' }
            });

            showSnackbar(response.data.message || `Cashout ${action}d successfully`, 'success');
            setProcessDialogOpen(false);
            setProcessingCashout(null);
            setAdminNotes('');
            await fetchAllCashouts();
        } catch (error) {
            console.error(`Error ${action}ing cashout:`, error);
            showSnackbar(error.response?.data?.error || `Failed to ${action} cashout`, 'error');
        }
        setProcessingAction(false);
    };

    const handleDeleteStripeAccount = async () => {
        if (!deleteAccountDialog) return;

        try {
            const response = await api.delete(`/payments/admin/stripe-account/${deleteAccountDialog.uid}`, {
                meta: { permission: 'admin' }
            });
            
            showSnackbar(response.data.message || 'Stripe account deleted successfully', 'success');
            setDeleteAccountDialog(null);
            await fetchUsersWithStripe();
        } catch (error) {
            console.error('Error deleting Stripe account:', error);
            showSnackbar(error.response?.data?.error || 'Failed to delete Stripe account', 'error');
        }
    };

    const handleDeleteCashoutRequest = async (cashoutId, cashoutData) => {
        if (!window.confirm(`Are you sure you want to delete this cashout request? ${cashoutData.status === 'PENDING' ? 'Points will be restored to the user.' : ''}`)) {
            return;
        }

        try {
            const response = await api.delete(`/payments/cashout/${cashoutId}`, {
                meta: { permission: 'admin' }
            });
            
            showSnackbar(response.data.message || 'Cashout request deleted successfully', 'success');
            
            // Refresh the data
            await fetchAllCashouts();
            if (permissions.can_viewCashoutHistory) {
                const cashoutRes = await api.get('/payments/cashout-history', {
                    meta: { permission: 'viewCashoutHistory' }
                });
                setCashoutHistory(cashoutRes.data.cashouts || []);
            }
        } catch (error) {
            console.error('Error deleting cashout request:', error);
            showSnackbar(error.response?.data?.error || 'Failed to delete cashout request', 'error');
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'warning';
            case 'processing': return 'info';
            case 'completed': return 'success';
            case 'failed': case 'rejected': return 'error';
            default: return 'default';
        }
    };

    const formatCurrency = (amount) => {
        // Handle undefined, null, or NaN values
        const numAmount = Number(amount);
        if (isNaN(numAmount) || amount === null || amount === undefined) {
            return '$0.00';
        }
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(numAmount);
    };

    const getDisplayAmount = (cashout) => {
        // Prioritize netAmount, fallback to amount, then calculate from points
        if (cashout.netAmount !== undefined && cashout.netAmount !== null) {
            return cashout.netAmount;
        }
        if (cashout.amount !== undefined && cashout.amount !== null) {
            return cashout.amount;
        }
        // Fallback: calculate from points (shouldn't happen with proper backend)
        return (cashout.points || 0) / 100;
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
            <AppLayout>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress />
                </Box>
            </AppLayout>
        );
    }

    // Check if user has basic view permission
    if (!permissions.can_viewCashout) {
        return (
            <AppLayout>
                <Box sx={{ p: 3 }}>
                    <Alert severity="error">
                        You do not have permission to access the cashout page.
                    </Alert>
                </Box>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Box sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant="h4" gutterBottom>
                    Cashout Center
                </Typography>

                {/* Show tabs for admin users, single view for regular users */}
                {permissions.can_admin ? (
                    <>
                        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
                            <Tab label="My Cashouts" />
                            <Tab label="Platform Statistics" />
                            <Tab label="All Cashout Requests" />
                            <Tab label="User Accounts" />
                        </Tabs>

                        <TabPanel value={tabValue} index={0}>
                            {renderUserCashoutView()}
                        </TabPanel>

                        <TabPanel value={tabValue} index={1}>
                            {renderPlatformStats()}
                        </TabPanel>

                        <TabPanel value={tabValue} index={2}>
                            {renderAllCashouts()}
                        </TabPanel>

                        <TabPanel value={tabValue} index={3}>
                            {renderUserAccounts()}
                        </TabPanel>
                    </>
                ) : (
                    renderUserCashoutView()
                )}
            </Box>

            {/* Dialogs */}
            {renderDialogs()}
        </AppLayout>
    );

    // Render functions
    function renderUserCashoutView() {
        return (
            <Grid container spacing={3}>
                {/* Points Balance Card - Hide for admins */}
                {permissions.can_viewPoints && !permissions.can_admin && (
                    <Grid item xs={12} md={6} lg={4}>
                        <Card sx={{ height: '200px', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <AccountBalanceWalletIcon sx={{ mr: 1 }} />
                                        <Typography variant="h6">Your Points</Typography>
                                    </Box>
                                    <Typography variant="h3" color="primary">
                                        {pointsData.pointsBalance || 0}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    ≈ {formatCurrency((pointsData.pointsBalance || 0) / 100)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                {/* Stripe Account Status */}
                {permissions.can_requestCashout && (
                    <Grid item xs={12} md={6} lg={4}>
                        <Card sx={{ height: '200px', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <VerifiedUserIcon sx={{ mr: 1 }} />
                                        <Typography variant="h6">Account Status</Typography>
                                        <Button
                                            size="small"
                                            onClick={handleRefreshStatus}
                                            sx={{ ml: 'auto' }}
                                        >
                                            <RefreshIcon />
                                        </Button>
                                    </Box>
                                    
                                    {onboardingStatus.hasStripeAccount ? (
                                        onboardingStatus.onboardingComplete ? (
                                            <Chip
                                                icon={<CheckCircleIcon />}
                                                label="Ready for Cashouts"
                                                color="success"
                                                variant="outlined"
                                            />
                                        ) : (
                                            <Chip
                                                icon={<WarningIcon />}
                                                label="Onboarding Incomplete"
                                                color="warning"
                                                variant="outlined"
                                            />
                                        )
                                    ) : (
                                        <Chip
                                            icon={<ErrorIcon />}
                                            label="No Stripe Account"
                                            color="error"
                                            variant="outlined"
                                        />
                                    )}
                                </Box>
                                <Box>
                                    {!onboardingStatus.onboardingComplete && (
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={handleStartOnboarding}
                                            disabled={onboardingLoading}
                                            fullWidth
                                            sx={{ mt: 1 }}
                                        >
                                            {onboardingLoading ? <CircularProgress size={20} /> : 'Set Up Payouts'}
                                        </Button>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                {/* Quick Actions */}
                {permissions.can_requestCashout && (
                    <Grid item xs={12} md={6} lg={4}>
                        <Card sx={{ height: '200px', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <Typography variant="h6" gutterBottom>
                                    Quick Actions
                                </Typography>
                                
                                <Box>
                                    {!onboardingStatus.hasStripeAccount ? (
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            onClick={handleStartOnboarding}
                                            disabled={onboardingLoading}
                                            sx={{ mb: 1 }}
                                        >
                                            {onboardingLoading ? 'Starting...' : 'Setup Stripe Account'}
                                        </Button>
                                    ) : !onboardingStatus.onboardingComplete ? (
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            onClick={handleStartOnboarding}
                                            disabled={onboardingLoading}
                                            sx={{ mb: 1 }}
                                        >
                                            {onboardingLoading ? 'Continuing...' : 'Continue Setup'}
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="contained"
                                            color="success"
                                            fullWidth
                                            onClick={() => setCashoutDialogOpen(true)}
                                            disabled={!pointsData.canCashout}
                                            sx={{ mb: 1 }}
                                        >
                                            Request Cashout
                                        </Button>
                                    )}
                                    
                                    {permissions.can_viewCashoutHistory && (
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            onClick={() => setHistoryDialogOpen(true)}
                                        >
                                            View History
                                        </Button>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                {/* Merged Admin Platform Management & Test Tools */}
                {permissions.can_admin && (
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Box sx={{ width: '70%' }}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom color="primary.main">
                                        Admin Platform Management & Testing
                                    </Typography>
                                    
                                    {/* Account Status */}
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Platform Balance Status:
                                        </Typography>
                                        {fixmateAccountStatus.exists ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                {fixmateAccountStatus.onboardingComplete ? (
                                                    <>
                                                        <CheckCircleIcon color="success" />
                                                        <Typography color="success.main">
                                                            Platform Balance Ready (${fixmateAccountStatus.availableBalance || 0} available)
                                                        </Typography>
                                                    </>
                                                ) : (
                                                    <>
                                                        <WarningIcon color="warning" />
                                                        <Typography color="warning.main">
                                                            Platform Balance Needs Configuration
                                                        </Typography>
                                                    </>
                                                )}
                                            </Box>
                                        ) : (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <ErrorIcon color="error" />
                                                <Typography color="error.main">
                                                    Platform Balance Not Configured
                                                </Typography>
                                            </Box>
                                        )}
                                        <Typography variant="body2" color="text.secondary">
                                            Current Status: Available ${fixmateAccountStatus.availableBalance || 0}, Pending ${fixmateAccountStatus.pendingBalance || 0}
                                        </Typography>
                                    </Box>

                                    {/* Platform Management Actions */}
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Platform Management:
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                                            {!fixmateAccountStatus.exists && (
                                                <Button
                                                    variant="contained"
                                                    onClick={handleCreateFixMateAccount}
                                                    disabled={fixmateAccountLoading}
                                                    color="primary"
                                                >
                                                    {fixmateAccountLoading ? 'Checking...' : 'Check Platform Balance'}
                                                </Button>
                                            )}
                                            
                                            {fixmateAccountStatus.exists && !fixmateAccountStatus.onboardingComplete && (
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => window.open('/admin/platform-balance', '_blank')}
                                                    disabled={fixmateAccountLoading}
                                                    color="info"
                                                >
                                                    View Balance Details
                                                </Button>
                                            )}

                                            {fixmateAccountStatus.exists && fixmateAccountStatus.onboardingComplete && (
                                                <>
                                                    <Button
                                                        variant="outlined"
                                                        onClick={handleAddFundsToFixMate}
                                                        disabled={fixmateAccountLoading}
                                                        color="success"
                                                    >
                                                        {fixmateAccountLoading ? 'Adding...' : 'Add Test Funds ($500)'}
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        onClick={fetchFixMateAccountStatus}
                                                        disabled={fixmateAccountLoading}
                                                    >
                                                        Refresh Status
                                                    </Button>
                                                </>
                                            )}
                                        </Box>
                                    </Box>

                                    {/* Test Tools */}
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="subtitle2" gutterBottom color="warning.main">
                                            Testing Tools:
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                                            <Button
                                                variant="outlined"
                                                onClick={handleSimulateRevenue}
                                                disabled={revenueSimulating}
                                                color="warning"
                                            >
                                                {revenueSimulating ? 'Working...' : 'Simulate Platform Revenue ($100)'}
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={handleMakeFundsAvailable}
                                                disabled={revenueSimulating}
                                                color="info"
                                            >
                                                {revenueSimulating ? 'Working...' : 'Make Funds Available'}
                                            </Button>
                                        </Box>
                                    </Box>

                                    {/* Instructions */}
                                    <Box sx={{ 
                                        backgroundColor: 'grey.50', 
                                        p: 2, 
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'grey.200'
                                    }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                            <strong>Platform Setup:</strong><br />
                                            1. Check platform balance (uses existing Stripe account)<br />
                                            2. No onboarding required - ready immediately<br />
                                            3. Add test funds if needed for testing<br />
                                            4. Process cashouts using platform balance directly
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                            <strong>Testing Instructions:</strong><br />
                                            1. Click "Simulate Revenue" to add test funds<br />
                                            2. Wait 1-2 minutes for Stripe to process<br />
                                            3. Refresh page to see updated balance<br />
                                            4. Use "Make Funds Available" for additional funds if needed
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                    </Grid>
                )}

                {/* Recent Cashouts */}
                {permissions.can_viewCashoutHistory && cashoutHistory.length > 0 && (
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Recent Cashout Requests
                                </Typography>
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Date</TableCell>
                                                <TableCell>Amount</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell>Stripe Transfer ID</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {cashoutHistory.slice(0, 5).map((cashout) => (
                                                <TableRow key={cashout.id}>
                                                    <TableCell>{formatDate(cashout.requestedAt)}</TableCell>
                                                    <TableCell>{formatCurrency(getDisplayAmount(cashout))}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={cashout.status}
                                                            color={getStatusColor(cashout.status)}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {cashout.stripeTransferId ? (
                                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                                                {cashout.stripeTransferId}
                                                            </Typography>
                                                        ) : (
                                                            <Typography variant="body2" color="text.secondary">
                                                                {cashout.status === 'PENDING' ? 'Pending' : 'N/A'}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Grid>
        );
    }

    function renderPlatformStats() {
        return (
            <Grid container spacing={3}>
                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <AccountBalanceIcon color="primary" sx={{ mr: 1 }} />
                                <Typography variant="h6">Platform Balance</Typography>
                            </Box>
                            <Typography variant="h4" color="primary">
                                {formatCurrency(platformStats.platformBalance?.available || 0)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Pending: {formatCurrency(platformStats.platformBalance?.pending || 0)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <AttachMoneyIcon color="success" sx={{ mr: 1 }} />
                                <Typography variant="h6">Total Paid Out</Typography>
                            </Box>
                            <Typography variant="h4" color="success.main">
                                {formatCurrency(platformStats.cashoutStatistics?.totalAmountPaidOut || 0)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {platformStats.cashoutStatistics?.completedRequests || 0} completed
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <PeopleIcon color="info" sx={{ mr: 1 }} />
                                <Typography variant="h6">Total Users</Typography>
                            </Box>
                            <Typography variant="h4" color="info.main">
                                {platformStats.userStatistics?.totalUsers || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {platformStats.userStatistics?.usersWithStripeAccounts || 0} with Stripe
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <AssessmentIcon color="warning" sx={{ mr: 1 }} />
                                <Typography variant="h6">Platform Fees</Typography>
                            </Box>
                            <Typography variant="h4" color="warning.main">
                                {formatCurrency(platformStats.cashoutStatistics?.totalPlatformFeesCollected || 0)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {platformStats.cashoutStatistics?.pendingRequests || 0} pending
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    }

    function renderAllCashouts() {
        const filteredCashouts = allCashouts.filter(cashout => {
            if (cashoutFilter !== 'ALL' && cashout.status !== cashoutFilter) return false;
            if (userFilter && !cashout.userName?.toLowerCase().includes(userFilter.toLowerCase())) return false;
            return true;
        });

        return (
            <Box>
                <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Status Filter</InputLabel>
                        <Select
                            value={cashoutFilter}
                            label="Status Filter"
                            onChange={(e) => setCashoutFilter(e.target.value)}
                        >
                            <MenuItem value="ALL">All</MenuItem>
                            <MenuItem value="PENDING">Pending</MenuItem>
                            <MenuItem value="PROCESSING">Processing</MenuItem>
                            <MenuItem value="COMPLETED">Completed</MenuItem>
                            <MenuItem value="FAILED">Failed</MenuItem>
                            <MenuItem value="REJECTED">Rejected</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        size="small"
                        label="Search User"
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        sx={{ minWidth: 200 }}
                    />
                </Box>

                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>User</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCashouts.map((cashout) => (
                                <TableRow key={cashout.id}>
                                    <TableCell>{cashout.userName || cashout.userId}</TableCell>
                                    <TableCell>{formatDate(cashout.requestedAt)}</TableCell>
                                    <TableCell>{formatCurrency(getDisplayAmount(cashout))}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={cashout.status}
                                            color={getStatusColor(cashout.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {cashout.status === 'PENDING' && (
                                            <Button
                                                size="small"
                                                onClick={() => {
                                                    setProcessingCashout(cashout);
                                                    setProcessDialogOpen(true);
                                                }}
                                            >
                                                Process
                                            </Button>
                                        )}
                                        {['PENDING', 'REJECTED'].includes(cashout.status) && (
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDeleteCashoutRequest(cashout.id, cashout)}
                                                sx={{ ml: 1 }}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        );
    }

    function renderUserAccounts() {
        return (
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>Stripe Account ID</TableCell>
                            <TableCell>Onboarding Complete</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {usersWithStripe.map((user) => (
                            <TableRow key={user.uid}>
                                <TableCell>{user.name || user.email}</TableCell>
                                <TableCell>{user.stripeAccountId}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.stripeOnboardingComplete ? 'Yes' : 'No'}
                                        color={user.stripeOnboardingComplete ? 'success' : 'warning'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{formatDate(user.stripeAccountCreated)}</TableCell>
                                <TableCell>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => setDeleteAccountDialog(user)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }

    function renderDialogs() {
        return (
            <>
                {/* Cashout Request Dialog */}
                <Dialog open={cashoutDialogOpen} onClose={() => setCashoutDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Request Cashout</DialogTitle>
                    <DialogContent>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Minimum cashout: $1.00 (100 points). Platform fee: 10%
                        </Alert>
                        
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Amount (USD)"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={cashoutAmount}
                            onChange={(e) => setCashoutAmount(e.target.value)}
                            inputProps={{ min: 5, step: 0.01 }}
                            helperText={`Available: ${formatCurrency((pointsData.pointsBalance || 0) / 100)}`}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCashoutDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleCashoutRequest}
                            variant="contained"
                            disabled={submittingCashout}
                        >
                            {submittingCashout ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* History Dialog */}
                <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>Transaction History</DialogTitle>
                    <DialogContent>
                        {permissions.can_viewPointsHistory && pointsHistory.length > 0 && (
                            <>
                                <Typography variant="h6" gutterBottom>Points History</Typography>
                                <TableContainer sx={{ mb: 3 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Date</TableCell>
                                                <TableCell>Points</TableCell>
                                                <TableCell>Reason</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {pointsHistory.slice(0, 10).map((transaction, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{formatDate(transaction.timestamp)}</TableCell>
                                                    <TableCell>
                                                        <Typography
                                                            color={transaction.points > 0 ? 'success.main' : 'error.main'}
                                                        >
                                                            {transaction.points > 0 ? '+' : ''}{transaction.points}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>{transaction.reason}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>
                        )}

                        {permissions.can_viewCashoutHistory && cashoutHistory.length > 0 && (
                            <>
                                <Typography variant="h6" gutterBottom>Cashout History</Typography>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Date</TableCell>
                                                <TableCell>Amount</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell>Notes</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {cashoutHistory.map((cashout) => (
                                                <TableRow key={cashout.id}>
                                                    <TableCell>{formatDate(cashout.requestedAt)}</TableCell>
                                                    <TableCell>{formatCurrency(getDisplayAmount(cashout))}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={cashout.status}
                                                            color={getStatusColor(cashout.status)}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell>{cashout.adminNotes || 'N/A'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
                    </DialogActions>
                </Dialog>

                {/* Admin Process Cashout Dialog */}
                <Dialog open={processDialogOpen} onClose={() => setProcessDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Process Cashout Request</DialogTitle>
                    <DialogContent>
                        {processingCashout && (
                            <>
                                <Typography variant="body1" gutterBottom>
                                    User: {processingCashout.userName || processingCashout.userId}
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    Amount: {formatCurrency(getDisplayAmount(processingCashout))}
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="Admin Notes"
                                    multiline
                                    rows={3}
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    margin="normal"
                                />
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setProcessDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => handleProcessCashout('reject')}
                            color="error"
                            disabled={processingAction}
                            startIcon={<CancelIcon />}
                        >
                            Reject
                        </Button>
                        <Button
                            onClick={() => handleProcessCashout('approve')}
                            color="success"
                            disabled={processingAction}
                            startIcon={<CheckCircleIcon />}
                        >
                            Approve
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Delete Stripe Account Dialog */}
                <Dialog open={!!deleteAccountDialog} onClose={() => setDeleteAccountDialog(null)}>
                    <DialogTitle>Delete Stripe Account</DialogTitle>
                    <DialogContent>
                        <Typography>
                            Are you sure you want to delete the Stripe account for {deleteAccountDialog?.name || deleteAccountDialog?.email}?
                            This action cannot be undone.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteAccountDialog(null)}>Cancel</Button>
                        <Button onClick={handleDeleteStripeAccount} color="error">
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    }
}
