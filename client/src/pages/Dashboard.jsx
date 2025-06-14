import React, {useEffect, useState} from 'react';
import {
    Box,
    CssBaseline,
    AppBar,
    Toolbar,
    Typography,
    Grid,
    Paper,
    CircularProgress,
    IconButton,
    useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import {useTheme} from '@mui/material/styles';
import Sidebar from '../components/Sidebar';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import InboxIcon from '@mui/icons-material/Inbox';
import axios from 'axios';

const drawerWidth = 240;

export default function Dashboard() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [stats, setStats] = useState({
        totalRequests: 0,
        inProgress: 0,
        completed: 0,
        unassigned: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const API = import.meta.env.VITE_API_URL;
                const res = await axios.get(`${API}/api/dashboard-stats`);
                setStats(res.data);
            } catch (err) {
                // fallback: keep zeros
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const cardMeta = [
        {
            label: 'Total Requests',
            icon: <AssignmentIcon fontSize="large" color="primary"/>,
            value: stats.totalRequests,
        },
        {
            label: 'In Progress',
            icon: <AutorenewIcon fontSize="large" color="warning"/>,
            value: stats.inProgress,
        },
        {
            label: 'Completed',
            icon: <CheckCircleIcon fontSize="large" color="success"/>,
            value: stats.completed,
        },
        {
            label: 'Pending Assignments',
            icon: <PersonOffIcon fontSize="large" color="error"/>,
            value: stats.unassigned,
        },
    ];

    const placeholder = (
        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1}}>
            <InboxIcon color="disabled"/>
            <Typography variant="body2" color="text.secondary">
                Nothing here yet
            </Typography>
        </Box>
    );

    return (
        <Box sx={{display: 'flex'}}>
            <CssBaseline/>
            <Sidebar
                activeItem="Dashboard"
                open={!isMobile || sidebarOpen}
                variant={isMobile ? 'temporary' : 'permanent'}
                onClose={() => setSidebarOpen(false)}
            />

            <Box
                sx={{
                    flexGrow: 1,
                    transition: 'margin-left 0.2s',
                    marginLeft: !isMobile ? `${drawerWidth}px` : 0,
                }}
            >
                <AppBar
                    position="fixed"
                    sx={{
                        zIndex: (theme) => theme.zIndex.drawer + 1,
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        left: !isMobile ? `${drawerWidth}px` : 0,
                        width: !isMobile ? `calc(100% - ${drawerWidth}px)` : '100%',
                        transition: 'left 0.2s, width 0.2s',
                    }}
                    elevation={0}
                >
                    <Toolbar>
                        {isMobile && (
                            <IconButton
                                color="inherit"
                                edge="start"
                                onClick={() => setSidebarOpen(true)}
                                sx={{mr: 2}}
                            >
                                <MenuIcon/>
                            </IconButton>
                        )}
                        <Typography variant="h6" noWrap>
                            FixMate Dashboard
                        </Typography>
                    </Toolbar>
                </AppBar>

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        bgcolor: theme.palette.background.default,
                        p: 3,
                        minHeight: '100vh',
                    }}
                >
                    <Toolbar/>

                    <Typography
                        variant="h5"
                        sx={{
                            mb: 3,
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                        }}
                    >
                        Overview
                    </Typography>

                    {loading ? (
                        <Box sx={{mt: 10, textAlign: 'center'}}>
                            <CircularProgress/>
                        </Box>
                    ) : (
                        <Grid container spacing={3}>
                            {cardMeta.map(({label, icon, value}) => (
                                <Grid item xs={12} sm={6} md={3} key={label}>
                                    <Paper
                                        elevation={3}
                                        sx={{
                                            p: 3,
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            textAlign: 'center',
                                            borderRadius: 3,
                                            backgroundColor: theme.palette.background.paper,
                                        }}
                                    >
                                        <Box sx={{mb: 1}}>{icon}</Box>
                                        <Typography variant="subtitle1" sx={{fontWeight: 600, mb: 1}}>
                                            {label}
                                        </Typography>
                                        {value > 0 ? (
                                            <Typography variant="h5" sx={{color: 'primary.main', fontWeight: 500}}>
                                                {value}
                                            </Typography>
                                        ) : (
                                            placeholder
                                        )}
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Box>
            </Box>
        </Box>
    );
}