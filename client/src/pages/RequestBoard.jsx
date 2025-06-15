import React, {useEffect, useState} from 'react';
import {
    Alert,
    AppBar,
    Box,
    Chip,
    CircularProgress,
    IconButton,
    Paper,
    Snackbar,
    Toolbar,
    Typography,
    useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import {useTheme} from '@mui/material/styles';
import Sidebar from '../components/Sidebar';
import {useAuthState} from 'react-firebase-hooks/auth';
import {auth} from '../firebase-config';
import axios from 'axios';
import {DragDropContext, Draggable, Droppable} from '@hello-pangea/dnd';

const drawerWidth = 240;
const columns = ['Pending', 'In Progress', 'Done'];

export default function RequestBoard() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({open: false, message: '', severity: 'success'});
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user] = useAuthState(auth);
    const userName = user?.displayName || user?.email || 'User';
    const userPhoto = user?.photoURL || '/default-avatar.png';

    useEffect(() => {
        fetchRequests();
        // eslint-disable-next-line
    }, []);

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

    // Group requests by status
    const grouped = columns.reduce((acc, col) => {
        acc[col] = requests.filter(req => req.status === col);
        return acc;
    }, {});

    // Handle drag and drop
    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const {draggableId, source, destination} = result;
        const sourceStatus = source.droppableId;
        const targetStatus = destination.droppableId;
        if (sourceStatus === targetStatus) return;

        // Optimistically update UI
        setRequests(prev =>
            prev.map(req =>
                req.id === draggableId ? {...req, status: targetStatus} : req
            )
        );

        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            await axios.patch(`${API}/api/requests/${draggableId}/status`, {status: targetStatus});
            setSnackbar({open: true, message: 'Request updated!', severity: 'success'});
        } catch (err) {
            // Rollback on error
            setRequests(prev =>
                prev.map(req =>
                    req.id === draggableId ? {...req, status: sourceStatus} : req
                )
            );
            setSnackbar({open: true, message: 'Status update failed', severity: 'error'});
            console.error('Status update failed', err);
        }
    };

    // Improved contrast for light mode
    const getColumnBg = () =>
        theme.palette.mode === 'dark'
            ? theme.palette.grey[900]
            : theme.palette.grey[100];

    const getCardBg = (isDragging) => {
        if (theme.palette.mode === 'dark') {
            return isDragging ? theme.palette.grey[700] : theme.palette.grey[800];
        }
        return isDragging ? theme.palette.grey[200] : theme.palette.background.paper;
    };

    // Calculate minHeight for columns: at least viewport height minus header, or enough for all cards
    const headerHeight = 64; // AppBar + Toolbar
    const minColHeight = `calc(100vh - ${headerHeight + 48}px)`; // 48px for title and padding

    return (
        <Box sx={{display: 'flex'}}>
            {/* Sidebar with user info */}
            {!isMobile && (
                <Sidebar
                    activeItem="Requests"
                    open={true}
                    variant="permanent"
                    onClose={() => {
                    }}
                    onCollapse={() => setSidebarOpen(false)}
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
                    marginLeft: !isMobile ? `${drawerWidth}px` : 0,
                }}
            >
                <AppBar
                    position="fixed"
                    sx={{
                        zIndex: theme.zIndex.drawer + 1,
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        left: !isMobile ? `${drawerWidth}px` : 0,
                        width: !isMobile ? `calc(100% - ${drawerWidth}px)` : '100%',
                        transition: 'left 0.2s, width 0.2s',
                        boxShadow: 'none',
                    }}
                    elevation={0}
                >
                    <Toolbar>
                        {(isMobile || sidebarOpen) && (
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
                            Request Status Board
                        </Typography>
                    </Toolbar>
                </AppBar>
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        bgcolor: theme.palette.background.default,
                        p: {xs: 1.5, sm: 3},
                        minHeight: '100vh',
                        width: '100%',
                    }}
                >
                    <Toolbar/>
                    <Typography variant="h5" fontWeight={600} sx={{mb: 3}}>
                        Request Status Board
                    </Typography>

                    {loading ? (
                        <Box sx={{mt: 10, textAlign: 'center'}}>
                            <CircularProgress/>
                        </Box>
                    ) : (
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: {xs: 'column', md: 'row'},
                                    gap: 3,
                                    overflowX: {xs: 'visible', md: 'auto'},
                                    width: '100%',
                                    alignItems: 'flex-start',
                                }}
                            >
                                {columns.map((col) => (
                                    <Droppable droppableId={col} key={col}>
                                        {(provided) => (
                                            <Box
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                sx={{
                                                    width: {xs: '100%', md: 340},
                                                    minWidth: 280,
                                                    maxWidth: 400,
                                                    backgroundColor: getColumnBg(),
                                                    borderRadius: 2,
                                                    p: 2,
                                                    minHeight: minColHeight,
                                                    boxShadow: 2,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    transition: 'width 0.2s',
                                                    height: 'auto',
                                                }}
                                            >
                                                <Typography
                                                    variant="subtitle1"
                                                    fontWeight={600}
                                                    sx={{
                                                        mb: 2,
                                                        textTransform: 'uppercase',
                                                        color: 'text.secondary',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    {col}
                                                </Typography>
                                                <Box sx={{flex: 1}}>
                                                    {grouped[col]?.map((req, index) => (
                                                        <Draggable key={req.id} draggableId={req.id} index={index}>
                                                            {(provided, snapshot) => (
                                                                <Paper
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    sx={{
                                                                        p: 2,
                                                                        mb: 2,
                                                                        borderLeft: `5px solid ${
                                                                            {
                                                                                Low: theme.palette.grey[400],
                                                                                Medium: theme.palette.info.main,
                                                                                High: theme.palette.warning.main,
                                                                                Critical: theme.palette.error.main,
                                                                            }[req.priority] || theme.palette.grey[400]
                                                                        }`,
                                                                        backgroundColor: getCardBg(snapshot.isDragging),
                                                                        transition: 'background-color 0.2s',
                                                                        boxShadow: snapshot.isDragging ? 6 : 2,
                                                                        cursor: 'grab',
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        fontWeight={600}>{req.title}</Typography>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        Machine: {req.machineId}
                                                                    </Typography>
                                                                    <Chip
                                                                        size="small"
                                                                        label={req.priority}
                                                                        color={
                                                                            {
                                                                                Low: 'default',
                                                                                Medium: 'info',
                                                                                High: 'warning',
                                                                                Critical: 'error',
                                                                            }[req.priority] || 'default'
                                                                        }
                                                                        sx={{mt: 1}}
                                                                    />
                                                                </Paper>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </Box>
                                            </Box>
                                        )}
                                    </Droppable>
                                ))}
                            </Box>
                        </DragDropContext>
                    )}

                    <Snackbar
                        open={snackbar.open}
                        autoHideDuration={3000}
                        onClose={() => setSnackbar({...snackbar, open: false})}
                        anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
                    >
                        <Alert
                            onClose={() => setSnackbar({...snackbar, open: false})}
                            severity={snackbar.severity}
                            sx={{width: '100%'}}
                        >
                            {snackbar.message}
                        </Alert>
                    </Snackbar>
                </Box>
            </Box>
        </Box>
    );
}