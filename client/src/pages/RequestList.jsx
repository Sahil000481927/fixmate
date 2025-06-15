import React, { useEffect, useState } from 'react';
                        import {
                            Box,
                            Typography,
                            Table,
                            TableHead,
                            TableRow,
                            TableCell,
                            TableBody,
                            Paper,
                            useMediaQuery,
                            Chip,
                            CircularProgress,
                            Button,
                            Toolbar,
                            AppBar,
                            IconButton,
                        } from '@mui/material';
                        import MenuIcon from '@mui/icons-material/Menu';
                        import { useTheme } from '@mui/material/styles';
                        import { useNavigate } from 'react-router-dom';
                        import Sidebar from '../components/Sidebar';
                        import { useAuthState } from 'react-firebase-hooks/auth';
                        import { auth } from '../firebase-config';
                        import axios from 'axios';

                        const drawerWidth = 240;

                        export default function RequestList() {
                            const theme = useTheme();
                            const navigate = useNavigate();
                            const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
                            const [sidebarOpen, setSidebarOpen] = useState(false);
                            const [collapsed, setCollapsed] = useState(false);

                            const [requests, setRequests] = useState([]);
                            const [loading, setLoading] = useState(true);

                            const [user] = useAuthState(auth);
                            const userName = user?.displayName || user?.email || 'User';
                            const userPhoto = user?.photoURL || '/default-avatar.png';

                            useEffect(() => {
                                const fetchRequests = async () => {
                                    try {
                                        const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
                                        const res = await axios.get(`${API}/api/requests`);
                                        setRequests(res.data);
                                    } catch (err) {
                                        console.error('Failed to fetch requests', err);
                                    } finally {
                                        setLoading(false);
                                    }
                                };
                                fetchRequests();
                            }, []);

                            useEffect(() => {
                                if (isMobile) {
                                    setSidebarOpen(false);
                                } else {
                                    setCollapsed(false);
                                }
                            }, [isMobile]);

                            return (
                                <Box sx={{ display: 'flex' }}>
                                    {/* Sidebar */}
                                    {!collapsed && !isMobile && (
                                        <Sidebar
                                            activeItem="Requests"
                                            open={true}
                                            variant="permanent"
                                            onClose={() => {}}
                                            onCollapse={() => setCollapsed(true)}
                                            userName={userName}
                                            logoUrl={userPhoto}
                                        />
                                    )}
                                    {isMobile && (
                                        <Sidebar
                                            activeItem="Requests"
                                            open={sidebarOpen}
                                            variant="temporary"
                                            onClose={() => setSidebarOpen(false)}
                                            onCollapse={() => setSidebarOpen(false)}
                                            userName={userName}
                                            logoUrl={userPhoto}
                                        />
                                    )}

                                    <Box
                                        sx={{
                                            flexGrow: 1,
                                            transition: 'margin-left 0.2s',
                                            marginLeft: !isMobile && !collapsed ? `${drawerWidth}px` : 0,
                                        }}
                                    >
                                        <AppBar
                                            position="fixed"
                                            sx={{
                                                zIndex: theme.zIndex.drawer + 1,
                                                background: theme.palette.background.paper,
                                                color: theme.palette.text.primary,
                                                borderBottom: `1px solid ${theme.palette.divider}`,
                                                left: !isMobile && !collapsed ? `${drawerWidth}px` : 0,
                                                width: !isMobile && !collapsed ? `calc(100% - ${drawerWidth}px)` : '100%',
                                                transition: 'left 0.2s, width 0.2s',
                                                boxShadow: 'none',
                                            }}
                                            elevation={0}
                                        >
                                            <Toolbar>
                                                {(isMobile || collapsed) && (
                                                    <IconButton
                                                        color="inherit"
                                                        edge="start"
                                                        onClick={() => isMobile ? setSidebarOpen(true) : setCollapsed(false)}
                                                        sx={{ mr: 2 }}
                                                    >
                                                        <MenuIcon />
                                                    </IconButton>
                                                )}
                                                <Typography variant="h6" noWrap>
                                                    Requests
                                                </Typography>
                                            </Toolbar>
                                        </AppBar>

                                        <Box
                                            component="main"
                                            sx={{
                                                flexGrow: 1,
                                                p: { xs: 1.5, sm: 3 },
                                                bgcolor: theme.palette.background.default,
                                                minHeight: '100vh',
                                            }}
                                        >
                                            <Toolbar />

                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    flexWrap: 'wrap',
                                                    gap: 1,
                                                    mb: 3,
                                                }}
                                            >
                                                <Typography
                                                    variant="h5"
                                                    sx={{
                                                        mb: 3,
                                                        fontWeight: 600,
                                                        color: theme.palette.text.primary,
                                                    }}
                                                >
                                                    Submitted Requests
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Button variant="contained" onClick={() => navigate('/requests/new')}>
                                                        + New Request
                                                    </Button>
                                                    <Button variant="outlined" onClick={() => navigate('/requests/board')}>
                                                        View Status Board
                                                    </Button>
                                                </Box>
                                            </Box>

                                            {loading ? (
                                                <Box sx={{ mt: 10, textAlign: 'center' }}>
                                                    <CircularProgress />
                                                </Box>
                                            ) : (
                                                <>
                                                    {!isMobile ? (
                                                        <Paper
                                                            elevation={2}
                                                            sx={{
                                                                overflowX: 'auto',
                                                                backgroundColor: theme.palette.background.paper,
                                                            }}
                                                        >
                                                            <Table>
                                                                <TableHead>
                                                                    <TableRow>
                                                                        <TableCell>Title</TableCell>
                                                                        <TableCell>Machine</TableCell>
                                                                        <TableCell>Priority</TableCell>
                                                                        <TableCell>Status</TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {requests.map((req) => (
                                                                        <TableRow key={req.id || req._id}>
                                                                            <TableCell>{req.title}</TableCell>
                                                                            <TableCell>{req.machineId}</TableCell>
                                                                            <TableCell>
                                                                                <Chip
                                                                                    label={req.priority}
                                                                                    color={
                                                                                        {
                                                                                            Low: 'default',
                                                                                            Medium: 'info',
                                                                                            High: 'warning',
                                                                                            Critical: 'error',
                                                                                        }[req.priority] || 'default'
                                                                                    }
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <Chip label={req.status} color="primary" variant="outlined" />
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </Paper>
                                                    ) : (
                                                        <Box>
                                                            {requests.map((req) => (
                                                                <Paper
                                                                    key={req.id || req._id}
                                                                    sx={{
                                                                        mb: 2,
                                                                        p: 2,
                                                                        backgroundColor: theme.palette.background.paper,
                                                                    }}
                                                                >
                                                                    <Typography variant="subtitle1" fontWeight={600}>
                                                                        {req.title}
                                                                    </Typography>
                                                                    <Typography variant="body2">Machine: {req.machineId}</Typography>
                                                                    <Typography variant="body2">
                                                                        Priority: <Chip size="small" label={req.priority} />
                                                                    </Typography>
                                                                    <Typography variant="body2">
                                                                        Status: <Chip size="small" label={req.status} variant="outlined" />
                                                                    </Typography>
                                                                </Paper>
                                                            ))}
                                                        </Box>
                                                    )}
                                                </>
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            );
                        }