import React, { useEffect, useState } from 'react';
import {
    Box, CircularProgress, Divider, Grid, Paper, Typography, Chip, useMediaQuery
} from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import BuildIcon from '@mui/icons-material/Build';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import AppLayout from '../components/AppLayout';
import MachineTypeInterrupter from '../components/MachineTypeInterrupter';
import { useSnackbar } from '../components/FeedbackSnackbar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import api from '../api/ApiClient';
import Card from '../components/Card'; // Adjust the import based on your file structure
import { useTheme } from '@mui/material/styles';

export default function DashboardPage() {
    const { showSnackbar } = useSnackbar();
    const [user] = useAuthState(auth);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalRequests: 0, pending: 0, inProgress: 0, completed: 0 });
    const [recentRequests, setRecentRequests] = useState([]);
    const [permissions, setPermissions] = useState({});

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                if (user?.uid) {
                    // Fetch permissions with retry logic for new users
                    let permRes;
                    let retries = 0;
                    const maxRetries = 5;

                    while (retries < maxRetries) {
                        try {
                            permRes = await api.get(`/users/${user.uid}/permissions`, {
                                meta: { permission: 'viewDashboard' }
                            });

                            // Check if we got valid permissions data
                            if (permRes.data && Object.keys(permRes.data).length > 0) {
                                break;
                            }
                        } catch (permErr) {
                            console.log('Retrying permissions fetch...', retries + 1);
                        }

                        // Wait 1 second before retrying
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        retries++;
                    }

                    if (!permRes || !permRes.data || Object.keys(permRes.data).length === 0) {
                        throw new Error('Unable to load user permissions. Please refresh the page.');
                    }

                    setPermissions(permRes.data);

                    // Fetch stats if allowed
                    if (permRes.data.can_viewDashboardStats) {
                        const statsRes = await api.get(`/requests/dashboard-stats`, {
                            meta: { permission: 'viewDashboardStats' }
                        });
                        setStats({
                            totalRequests: statsRes.data.totalRequests,
                            pending: statsRes.data.pending,
                            inProgress: statsRes.data.inProgress,
                            completed: statsRes.data.completed
                        });
                    }

                    // Fetch recent requests if allowed
                    if (permRes.data.can_viewDashboardRecent) {
                        const recentRes = await api.get(`/requests/dashboard-recent`, {
                            meta: { permission: 'viewDashboardRecent' }
                        });
                        setRecentRequests(recentRes.data);
                    }
                }
            } catch (err) {
                console.error('Dashboard fetch failed', err);
                showSnackbar(err.message || 'Failed to load dashboard data', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user, showSnackbar]);

    const cardMeta = [
        {
            label: 'Total Requests',
            icon: <AssignmentTurnedInIcon sx={{ fontSize: 48, color: 'white' }} />, // filled icon
            circleColor: 'primary.main',
            value: stats.totalRequests
        },
        {
            label: 'Pending',
            icon: <PendingActionsIcon sx={{ fontSize: 48, color: 'white' }} />, // filled icon
            circleColor: 'warning.main',
            value: stats.pending
        },
        {
            label: 'In Progress',
            icon: <BuildIcon sx={{ fontSize: 48, color: 'white' }} />, // filled icon
            circleColor: 'info.main',
            value: stats.inProgress
        },
        {
            label: 'Completed',
            icon: <DoneAllIcon sx={{ fontSize: 48, color: 'white' }} />, // filled icon
            circleColor: 'success.main',
            value: stats.completed
        }
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'warning';
            case 'In Progress': return 'info';
            case 'Completed': return 'success';
            default: return 'default';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Pending': return <PendingActionsIcon sx={{ fontSize: 28, color: 'white' }} />;
            case 'In Progress': return <BuildIcon sx={{ fontSize: 28, color: 'white' }} />;
            case 'Completed': return <DoneAllIcon sx={{ fontSize: 28, color: 'white' }} />;
            default: return <AssignmentTurnedInIcon sx={{ fontSize: 28, color: 'white' }} />;
        }
    };

    return (
        <AppLayout activeItem="Dashboard" title="Dashboard">
            <MachineTypeInterrupter userPermissions={permissions} />
            {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%' }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {/* Stats Cards */}
                    {permissions.can_viewDashboardStats && (
                        <Grid container spacing={2} justifyContent="center" sx={{ mb: 4, width: '100%' }}>
                            {cardMeta.map(({ label, icon, value, circleColor }) => (
                                <Grid key={label} item xs={12} sm={6} md={3} lg={3} sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <Paper
                                        elevation={4}
                                        sx={{
                                            p: isMobile ? 2 : 4,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            minWidth: isMobile ? 160 : 220,
                                            maxWidth: 400,
                                            minHeight: isMobile ? 120 : 180,
                                            justifyContent: 'center',
                                            borderRadius: 4,
                                            boxShadow: '0 2px 12px 0 rgba(0,0,0,0.07)',
                                            transition: 'transform 0.2s',
                                            '&:hover': { transform: 'scale(1.04)', boxShadow: '0 4px 24px 0 rgba(0,0,0,0.12)' }
                                        }}
                                    >
                                        <Box sx={{
                                            width: isMobile ? 40 : 72,
                                            height: isMobile ? 40 : 72,
                                            borderRadius: '50%',
                                            background: theme => theme.palette[circleColor.split('.')[0]].main,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mb: 2,
                                            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)'
                                        }}>
                                            {React.cloneElement(icon, { sx: { fontSize: isMobile ? 24 : 48, color: 'white' } })}
                                        </Box>
                                        <Typography variant={isMobile ? 'body1' : 'h6'} sx={{ mt: 1 }}>{label}</Typography>
                                        <Typography variant={isMobile ? 'h5' : 'h3'} color="primary" sx={{ fontWeight: 700 }}>{value}</Typography>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {/* Recent Requests List */}
                    {permissions.can_viewDashboardRecent && (
                        <Box>
                            <Typography variant="h6" sx={{ mb: 1 }}>Recent Requests</Typography>
                            <Box sx={{ p: 0, background: 'transparent', boxShadow: 'none', border: 'none', maxWidth: 600 }}>
                                {recentRequests.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No recent requests.</Typography>
                                ) : (
                                    recentRequests.map((req) => (
                                        <Card
                                            key={req.id}
                                            title={req.title}
                                            subtitle={`Machine: ${req.machineId}`}
                                            content={<Typography variant="body2">{req.description}</Typography>}
                                            status={req.status}
                                            priority={req.priority}
                                        />
                                    ))
                                )}
                            </Box>
                        </Box>
                    )}
                </>
            )}
        </AppLayout>
    );
}
