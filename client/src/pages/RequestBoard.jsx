import React, {useEffect, useState} from 'react';
import {
    Box,
    Typography,
    Paper,
    Chip,
    CircularProgress,
    useMediaQuery,
    Toolbar,
    Snackbar,
    Alert,
    AppBar,
    IconButton,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import {useTheme} from '@mui/material/styles';
import Sidebar from '../components/Sidebar';
import axios from 'axios';
import {
    DragDropContext,
    Droppable,
    Draggable
} from '@hello-pangea/dnd';

const drawerWidth = 240;
const columns = ['Pending', 'In Progress', 'Done'];

export default function RequestBoard() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({open: false, message: '', severity: 'success'});
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

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

    const updateRequestStatus = async (id, newStatus) => {
        try {
            const API = import.meta.env.VITE_API_URL;
            await axios.patch(`${API}/api/requests/${id}/status`, {status: newStatus});
            setSnackbar({open: true, message: 'Request updated!', severity: 'success'});
            fetchRequests();
        } catch (err) {
            setSnackbar({open: true, message: 'Status update failed', severity: 'error'});
            console.error('Status update failed', err);
        }
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const {draggableId, source, destination} = result;
        const sourceStatus = source.droppableId;
        const targetStatus = destination.droppableId;
        if (sourceStatus !== targetStatus) {
            updateRequestStatus(draggableId, targetStatus);
        }
    };

    const grouped = columns.reduce((acc, col) => {
        acc[col] = requests.filter(req => req.status === col);
        return acc;
    }, {});

    const getColumnBg = () =>
        theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.background.paper;

    const getCardBg = (isDragging) => {
        if (theme.palette.mode === 'dark') {
            return isDragging ? theme.palette.grey[700] : theme.palette.grey[800];
        }
        return isDragging ? theme.palette.grey[100] : theme.palette.background.paper;
    };

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
                            Request Status Board
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
                                    overflowX: 'auto',
                                }}
                            >
                                {columns.map((col) => (
                                    <Droppable droppableId={col} key={col}>
                                        {(provided) => (
                                            <Box
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                sx={{
                                                    flex: 1,
                                                    minWidth: 280,
                                                    backgroundColor: getColumnBg(),
                                                    borderRadius: 2,
                                                    p: 2,
                                                    minHeight: 500,
                                                    boxShadow: 2,
                                                }}
                                            >
                                                <Typography
                                                    variant="subtitle1"
                                                    fontWeight={600}
                                                    sx={{mb: 2, textTransform: 'uppercase', color: 'text.secondary'}}
                                                >
                                                    {col}
                                                </Typography>

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
                                                                            Low: '#aaa',
                                                                            Medium: theme.palette.info.main,
                                                                            High: theme.palette.warning.main,
                                                                            Critical: theme.palette.error.main
                                                                        }[req.priority] || '#ccc'
                                                                    }`,
                                                                    backgroundColor: getCardBg(snapshot.isDragging),
                                                                    transition: 'background-color 0.2s',
                                                                }}
                                                            >
                                                                <Typography fontWeight={600}>{req.title}</Typography>
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
                                                                            Critical: 'error'
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