import React, {useEffect, useState} from 'react';
import {
    Container,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Box,
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
import {useTheme} from '@mui/material/styles';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const drawerWidth = 240;

export default function RequestList() {
    const theme = useTheme();
    const navigate = useNavigate();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const API = import.meta.env.VITE_API_URL;
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

    return (
        <Box sx={{display: 'flex'}}>
            <Sidebar
                activeItem="Requests"
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
                            Requests
                        </Typography>
                    </Toolbar>
                </AppBar>

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 3,
                        bgcolor: theme.palette.background.default,
                        minHeight: '100vh',
                    }}
                >
                    <Toolbar/>

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
                        <Box sx={{display: 'flex', gap: 1}}>
                            <Button variant="contained" onClick={() => navigate('/requests/new')}>
                                + New Request
                            </Button>
                            <Button variant="outlined" onClick={() => navigate('/requests/board')}>
                                View Status Board
                            </Button>
                        </Box>
                    </Box>

                    {loading ? (
                        <Box sx={{mt: 10, textAlign: 'center'}}>
                            <CircularProgress/>
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
                                                <TableRow key={req.id}>
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
                                                        <Chip label={req.status} color="primary" variant="outlined"/>
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
                                            key={req.id}
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
                                                Priority: <Chip size="small" label={req.priority}/>
                                            </Typography>
                                            <Typography variant="body2">
                                                Status: <Chip size="small" label={req.status} variant="outlined"/>
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