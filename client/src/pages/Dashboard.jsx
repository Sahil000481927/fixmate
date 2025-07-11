import React, {useEffect, useState} from 'react';
import {Box, CircularProgress, Divider, Grid, List, ListItem, ListItemText, Paper, Typography,} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BuildIcon from '@mui/icons-material/Build';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import InboxIcon from '@mui/icons-material/Inbox';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';

import AppLayout from '../components/AppLayout';
import axios from 'axios';
import MachineTypeInterrupter from '../components/MachineTypeInterrupter';

export default function Dashboard() {
    const [user] = useAuthState(auth);
    const [userRole, setUserRole] = useState(null);
    const [canView, setCanView] = useState(true);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalRequests: 0, pending: 0, inProgress: 0, done: 0 });
    const [recentRequests, setRecentRequests] = useState([]);

    useEffect(() => {
        if (user) {
            const fetchRoleAndPermissions = async () => {
                try {
                    const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
                    const token = await user.getIdToken();
                    const res = await axios.get(`${API}/api/users/${user.uid}/permissions`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setUserRole(res.data.role || 'user');
                    setCanView(res.data.can_view_dashboard !== false);
                } catch {
                    setUserRole('user');
                    setCanView(true); // default allow
                }
            };
            fetchRoleAndPermissions();
        }
    }, [user]);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                if (!user) return;
                const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
                const token = await user.getIdToken();
                const statsRes = await axios.get(`${API}/api/requests/dashboard-stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(statsRes.data);
                const recentRes = await axios.get(`${API}/api/requests/dashboard-recent`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRecentRequests(recentRes.data || []);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchDashboard();
    }, [user]);

    if (!canView) return null;

    const cardMeta = [
        {
            label: 'Total Requests',
            icon: <AssignmentIcon fontSize="large" color="primary"/>,
            value: stats.totalRequests,
        },
        {
            label: 'Pending',
            icon: <PendingActionsIcon fontSize="large" color="warning"/>,
            value: stats.pending,
        },
        {
            label: 'In Progress',
            icon: <BuildIcon fontSize="large" color="info"/>,
            value: stats.inProgress,
        },
        {
            label: 'Completed',
            icon: <DoneAllIcon fontSize="large" color="success"/>,
            value: stats.done,
        },
    ];

    return (
        <AppLayout activeItem="dashboard">
            <MachineTypeInterrupter />
            <Box
                sx={{
                    mt: 4,
                    mb: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    px: {xs: 1.5, sm: 3, md: 5},
                    width: '100%',
                    boxSizing: 'border-box',
                }}
            >
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 700,
                        color: 'text.primary',
                        mb: 2,
                        letterSpacing: 0.5,
                        width: '100%',
                        textAlign: 'left',
                    }}
                >
                    Overview
                </Typography>
                {loading ? (
                    <Box sx={{mt: 10, textAlign: 'center'}}>
                        <CircularProgress/>
                    </Box>
                ) : (
                    <Grid
                        container
                        spacing={2}
                        justifyContent="center"
                        sx={{mb: 4, width: '100%'}}
                    >
                        {cardMeta.map(({label, icon, value}) => (
                            <Grid
                                item
                                xs={12}
                                sm={6}
                                md={3}
                                key={label}
                                sx={{display: 'flex', justifyContent: 'center'}}
                            >
                                <Paper
                                    elevation={4}
                                    sx={{
                                        p: 2.5,
                                        minWidth: 228,
                                        minHeight: 152,
                                        width: '100%',
                                        maxWidth: 304,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                        borderRadius: 4,
                                        backgroundColor: 'background.paper',
                                        fontSize: '1.1rem',
                                        boxShadow: 3,
                                    }}
                                >
                                    <Box sx={{mb: 1}}>{icon}</Box>
                                    <Typography
                                        variant="subtitle1"
                                        sx={{
                                            fontWeight: 600,
                                            mb: 1,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {label}
                                    </Typography>
                                    {value > 0 ? (
                                        <Typography
                                            variant="h4"
                                            sx={{color: 'primary.main', fontWeight: 600}}
                                        >
                                            {value}
                                        </Typography>
                                    ) : (
                                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                            <InboxIcon color="disabled"/>
                                            <Typography variant="body2" color="text.secondary">
                                                No data
                                            </Typography>
                                        </Box>
                                    )}
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                )}

                <Box
                    sx={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: {xs: 'center', md: 'center'},
                        mt: 2,
                        mb: 2,
                    }}
                >
                    <Paper
                        variant="outlined"
                        sx={{
                            p: {xs: 2, sm: 3},
                            borderRadius: 3,
                            boxShadow: 1,
                            width: {xs: '100%', md: '90%'},
                            mx: 'auto',
                        }}
                    >
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 600,
                                mb: 1,
                                ml: {xs: 0, sm: 1},
                                textAlign: 'left',
                            }}
                        >
                            Recent Requests
                        </Typography>
                        {recentRequests.length === 0 ? (
                            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                <InboxIcon color="disabled"/>
                                <Typography variant="body2" color="text.secondary">
                                    No recent requests
                                </Typography>
                            </Box>
                        ) : (
                            <List dense>
                                {recentRequests.map((req, idx) => (
                                    <React.Fragment key={req.id || req._id}>
                                        <ListItem>
                                            <ListItemText
                                                primary={req.title || `Request #${(req.id || req._id || '').slice(-5)}`}
                                                secondary={`Status: ${req.status} • ${new Date(
                                                    req.createdAt
                                                ).toLocaleString()}`}
                                                primaryTypographyProps={{
                                                    sx: {fontSize: '1rem', fontWeight: 500},
                                                }}
                                                secondaryTypographyProps={{
                                                    sx: {fontSize: '0.95rem', color: 'text.secondary'},
                                                }}
                                            />
                                        </ListItem>
                                        {idx < recentRequests.length - 1 && (
                                            <Divider component="li"/>
                                        )}
                                    </React.Fragment>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Box>
            </Box>
        </AppLayout>
    );
}