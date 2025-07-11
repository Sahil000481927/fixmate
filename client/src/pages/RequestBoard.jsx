import React, {useEffect, useState} from 'react';
import {
    Alert,
    AppBar,
    Box,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Snackbar,
    Toolbar,
    Typography,
    TextField,
    Button,
    useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import {useTheme} from '@mui/material/styles';
import Sidebar from '../components/Sidebar';
import {useAuthState} from 'react-firebase-hooks/auth';
import {auth} from '../firebase-config';
import axios from 'axios';
import {DragDropContext, Draggable, Droppable} from '@hello-pangea/dnd';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const drawerWidth = 240;
const columns = ['Pending', 'In Progress', 'Done'];

export default function RequestBoard() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({open: false, message: '', severity: 'success'});
    const [user] = useAuthState(auth);
    const [userRole, setUserRole] = useState(null);
    const [canEditDelete, setCanEditDelete] = useState(false);
    const [canViewRequests, setCanViewRequests] = useState(false);
    const [editDialog, setEditDialog] = useState({open: false, request: null});
    const [deleteDialog, setDeleteDialog] = useState({open: false, request: null});
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const userName = user?.displayName || user?.email || 'User';
    const userPhoto = user?.photoURL || '/default-avatar.png';
    const [machines, setMachines] = useState([]);

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
                    setCanEditDelete(res.data.can_edit_requests || res.data.can_delete_requests);
                    setCanViewRequests(res.data.can_view_requests || res.data.viewRequests || false);
                } catch {
                    setUserRole('user');
                    setCanEditDelete(false);
                    setCanViewRequests(false);
                }
            };
            fetchRoleAndPermissions();
        }
        // eslint-disable-next-line
    }, [user]);

    useEffect(() => {
        if (user && userRole) {
            fetchRequests();
        }
    }, [user, userRole]);

    // Fetch requests using the correct API and handle permission
    const fetchRequests = async () => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            if (!user || !userRole) return;
            const token = await user.getIdToken();
            // Use /requests/requests-by-role endpoint for role-based filtering
            const res = await axios.get(`${API}/api/requests/requests-by-role`, {
                params: {
                    userId: user.uid,
                    role: userRole, // always use the actual userRole
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(res.data || []);
            setCanViewRequests(true);
        } catch (err) {
            // If forbidden, show board with no cards and trigger global snackbar
            if (err.response && err.response.status === 403) {
                setRequests([]);
                setCanViewRequests(false);
                // Trigger global snackbar via custom event (main.jsx listens for this pattern)
                window.dispatchEvent(new CustomEvent('global-snackbar', { detail: { message: 'You do not have permission to view requests.', severity: 'error' } }));
            } else {
                setCanViewRequests(false);
            }
        } finally {
            setLoading(false);
        }
    };

    // Fetch machines for mapping machineId to name
    useEffect(() => {
        const fetchMachines = async () => {
            try {
                if (!user) return;
                const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
                const token = await user.getIdToken();
                const res = await axios.get(`${API}/api/machines`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMachines(res.data);
            } catch (err) {
                setMachines([]);
            }
        };
        if (user) fetchMachines();
    }, [user]);

    // Helper to get machine name by id
    const getMachineName = (id) => {
        const machine = machines.find(m => m.id === id || m._id === id);
        return machine ? machine.name : id;
    };

    // Harmonize assignment status to request status (should match backend)
    function assignmentStatusToRequestStatus(assignmentStatus) {
        switch ((assignmentStatus || '').toLowerCase()) {
            case 'unassigned':
                return 'Pending';
            case 'assigned':
            case 'in_progress':
                return 'In Progress';
            case 'completed':
            case 'done':
                return 'Done';
            default:
                return 'Pending';
        }
    }
    // Harmonize request status to assignment status (should match backend)
    function requestStatusToAssignmentStatus(requestStatus) {
        switch ((requestStatus || '').toLowerCase()) {
            case 'pending':
                return 'unassigned';
            case 'in progress':
                return 'in_progress';
            case 'done':
                return 'completed';
            default:
                return 'unassigned';
        }
    }

    // Group requests by harmonized status
    const grouped = columns.reduce((acc, col) => {
        acc[col] = requests.filter(req => req.status === col);
        return acc;
    }, {});

    // Only allow drag if canEditDelete is true
    const isDragDisabled = !canEditDelete;

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
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/g, '');
            const token = await user.getIdToken();
            // Also update assignment status in backend if needed
            await axios.patch(`${API}/api/requests/${draggableId}/status`, {
                status: targetStatus,
                assignmentStatus: requestStatusToAssignmentStatus(targetStatus),
                userId: user?.uid,
                role: userRole
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
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

    const handleEdit = async (updatedRequest) => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            await axios.patch(`${API}/api/requests/${updatedRequest.id}`, updatedRequest);
            await fetchRequests();
            setSnackbar({open: true, message: 'Request updated!', severity: 'success'});
        } catch {
            setSnackbar({open: true, message: 'Failed to update request.', severity: 'error'});
        }
    };

    const handleDelete = async (requestId) => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            await axios.delete(`${API}/api/requests/${requestId}`);
            await fetchRequests();
            setSnackbar({open: true, message: 'Request deleted!', severity: 'success'});
        } catch {
            setSnackbar({open: true, message: 'Failed to delete request.', severity: 'error'});
        }
    };

    const openEditDialog = (request) => setEditDialog({open: true, request});
    const closeEditDialog = () => setEditDialog({open: false, request: null});
    const openDeleteDialog = (request) => setDeleteDialog({open: true, request});
    const closeDeleteDialog = () => setDeleteDialog({open: false, request: null});

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

                    {loading ? (
                        <Box sx={{mt: 10, textAlign: 'center'}}>
                            <CircularProgress/>
                        </Box>
                    ) : canViewRequests ? (
                        <DragDropContext onDragEnd={canEditDelete ? onDragEnd : () => {}}>
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
                                    <Droppable droppableId={col} key={col} isDropDisabled={isDragDisabled}>
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
                                                        <Draggable key={req.id} draggableId={req.id} index={index} isDragDisabled={isDragDisabled}>
                                                            {(provided, snapshot) => (
                                                                <Paper
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...(canEditDelete ? provided.dragHandleProps : {})}
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
                                                                        cursor: canEditDelete ? 'grab' : 'default',
                                                                    }}
                                                                >
                                                                    <Typography fontWeight={600}>{req.title}</Typography>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        Machine: {getMachineName(req.machineId)}
                                                                    </Typography>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
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
                                                                        />
                                                                        {/* Only show edit/delete if canEditDelete */}
                                                                        {canEditDelete && (
                                                                            <Box sx={{ display: 'flex', gap: 1, ml: 1 }}>
                                                                                <IconButton
                                                                                    color="primary"
                                                                                    onClick={() => openEditDialog(req)}
                                                                                    size="small"
                                                                                >
                                                                                    <EditIcon/>
                                                                                </IconButton>
                                                                                <IconButton
                                                                                    color="error"
                                                                                    onClick={() => openDeleteDialog(req)}
                                                                                    size="small"
                                                                                >
                                                                                    <DeleteIcon/>
                                                                                </IconButton>
                                                                            </Box>
                                                                        )}
                                                                    </Box>
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
                    ) : (
                        <Box sx={{mt: 10, textAlign: 'center'}}>
                            <Typography variant="h6" color="text.secondary">
                                You do not have permission to view requests.
                            </Typography>
                        </Box>
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

                    {/* Edit Dialog */}
                    <Dialog open={editDialog.open} onClose={closeEditDialog} maxWidth="xs" fullWidth>
                        <DialogTitle>Edit Request</DialogTitle>
                        <DialogContent>
                            {editDialog.request && (
                                <Box
                                    component="form"
                                    id="edit-request-form"
                                    sx={{display: 'flex', flexDirection: 'column', gap: 2}}
                                >
                                    <TextField
                                        label="Title"
                                        value={editDialog.request.title}
                                        onChange={e => setEditDialog(ed => ({
                                            ...ed,
                                            request: {...ed.request, title: e.target.value},
                                        }))}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Machine ID"
                                        value={editDialog.request.machineId}
                                        onChange={e => setEditDialog(ed => ({
                                            ...ed,
                                            request: {...ed.request, machineId: e.target.value},
                                        }))}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Priority"
                                        value={editDialog.request.priority}
                                        onChange={e => setEditDialog(ed => ({
                                            ...ed,
                                            request: {...ed.request, priority: e.target.value},
                                        }))}
                                        fullWidth
                                    />
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={closeEditDialog} color="inherit">Cancel</Button>
                            <Button
                                type="submit"
                                form="edit-request-form"
                                onClick={async () => {
                                    await handleEdit(editDialog.request);
                                    closeEditDialog();
                                }}
                                color="primary"
                                variant="contained"
                            >
                                Save
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Delete Dialog */}
                    <Dialog open={deleteDialog.open} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
                        <DialogTitle>Delete Request</DialogTitle>
                        <DialogContent>
                            <Typography>Are you sure you want to delete "{deleteDialog.request?.title}"?</Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={closeDeleteDialog} color="inherit">Cancel</Button>
                            <Button
                                onClick={async () => {
                                    await handleDelete(deleteDialog.request.id);
                                    closeDeleteDialog();
                                }}
                                color="error"
                                variant="contained"
                            >
                                Delete
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Box>
        </Box>
    );
}