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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Snackbar,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import axios from 'axios';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

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
    const [userRole, setUserRole] = useState(null);
    const [canEditDelete, setCanEditDelete] = useState(false);
    const [editDialog, setEditDialog] = useState({ open: false, request: null });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, request: null });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Add a logout dialog state
    const [logoutDialog, setLogoutDialog] = useState(false);

    // Fix: Define userName and userPhoto
    const userName = user?.displayName || user?.email || 'User';
    const userPhoto = user?.photoURL || '/default-avatar.png';

    // Move fetchRequests to top-level so it can be reused
    const fetchRequests = async () => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/,'');
            if (!user) return;
            const token = await user.getIdToken();
            // Use /requests/requests-by-role endpoint for role-based filtering
            const res = await axios.get(`${API}/api/requests/requests-by-role`, {
                params: {
                    userId: user.uid,
                    role: userRole || 'user',
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(res.data);
        } catch {
            setSnackbar({ open: true, message: 'Failed to fetch requests', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            const fetchRoleAndPermissions = async () => {
                try {
                    const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
                    // Fetch user role and permissions from backend
                    const res = await axios.get(`${API}/api/users/${user.uid}/permissions`);
                    setUserRole(res.data.role || 'user');
                    setCanEditDelete(res.data.can_edit_requests || res.data.can_delete_requests);
                } catch {
                    setUserRole('user');
                    setCanEditDelete(false);
                }
            };
            fetchRoleAndPermissions();
        }
    }, [user]);

    useEffect(() => {
        if (user && userRole) {
            fetchRequests();
        }
    }, [user, userRole]);

    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false);
        } else {
            setCollapsed(false);
        }
    }, [isMobile]);

    const handleEdit = async (updatedRequest) => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            await axios.patch(`${API}/api/requests/${updatedRequest.id}`, updatedRequest);
            await fetchRequests();
            setSnackbar({ open: true, message: 'Request updated!', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: 'Failed to update request.', severity: 'error' });
        }
    };

    const handleDelete = async (requestId) => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            await axios.delete(`${API}/api/requests/${requestId}`);
            await fetchRequests();
            setSnackbar({ open: true, message: 'Request deleted!', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: 'Failed to delete request.', severity: 'error' });
        }
    };

    const openEditDialog = (request) => setEditDialog({ open: true, request });
    const closeEditDialog = () => setEditDialog({ open: false, request: null });
    const openDeleteDialog = (request) => setDeleteDialog({ open: true, request });
    const closeDeleteDialog = () => setDeleteDialog({ open: false, request: null });

    // Add a logout handler
    const handleLogout = async () => {
        setLogoutDialog(false);
        await auth.signOut();
        navigate('/login');
    };

    // Ensure permissions are fetched before rendering requests
    if (loading || userRole === null) {
        return (
            <Box sx={{ mt: 10, textAlign: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

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
                    onLogout={() => setLogoutDialog(true)} // Pass a logout handler to Sidebar (if Sidebar supports it)
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
                    ) : requests.length === 0 ? (
                        <Box sx={{ mt: 10, textAlign: 'center' }}>
                            <Typography variant="h6" color="text.secondary">
                                No requests found.
                            </Typography>
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
                                                {canEditDelete && <TableCell>Actions</TableCell>}
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
                                                            color={{
                                                                Low: 'default',
                                                                Medium: 'info',
                                                                High: 'warning',
                                                                Critical: 'error',
                                                            }[req.priority] || 'default'}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip label={req.status} color="primary" variant="outlined" />
                                                    </TableCell>
                                                    {canEditDelete && (
                                                        <TableCell>
                                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                                <IconButton color="primary" onClick={() => openEditDialog(req)} size="small">
                                                                    <EditIcon />
                                                                </IconButton>
                                                                <IconButton color="error" onClick={() => openDeleteDialog(req)} size="small">
                                                                    <DeleteIcon />
                                                                </IconButton>
                                                            </Box>
                                                        </TableCell>
                                                    )}
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
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="body2">
                                                    Priority:
                                                </Typography>
                                                <Chip size="small" label={req.priority} />
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="body2">
                                                    Status:
                                                </Typography>
                                                <Chip size="small" label={req.status} variant="outlined" />
                                            </Box>
                                            {canEditDelete && (
                                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                                    <IconButton color="primary" onClick={() => openEditDialog(req)} size="small">
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton color="error" onClick={() => openDeleteDialog(req)} size="small">
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Box>
                                            )}
                                        </Paper>
                                    ))}
                                </Box>
                            )}
                        </>
                    )}

                    {/* Edit Dialog */}
                    <Dialog open={editDialog.open} onClose={closeEditDialog} maxWidth="xs" fullWidth>
                        <DialogTitle>Edit Request</DialogTitle>
                        <DialogContent>
                            {editDialog.request && (
                                <Box component="form" id="edit-request-form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <TextField
                                        label="Title"
                                        value={editDialog.request.title}
                                        onChange={e => setEditDialog(ed => ({ ...ed, request: { ...ed.request, title: e.target.value } }))}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Machine ID"
                                        value={editDialog.request.machineId}
                                        onChange={e => setEditDialog(ed => ({ ...ed, request: { ...ed.request, machineId: e.target.value } }))}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Priority"
                                        value={editDialog.request.priority}
                                        onChange={e => setEditDialog(ed => ({ ...ed, request: { ...ed.request, priority: e.target.value } }))}
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
                                onClick={async () => { await handleEdit(editDialog.request); closeEditDialog(); }}
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
                                onClick={async () => { await handleDelete(deleteDialog.request.id); closeDeleteDialog(); }}
                                color="error"
                                variant="contained"
                            >
                                Delete
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Logout Confirmation Dialog */}
                    <Dialog open={logoutDialog} onClose={() => setLogoutDialog(false)} maxWidth="xs" fullWidth>
                        <DialogTitle>Confirm Logout</DialogTitle>
                        <DialogContent>
                            <Typography>Are you sure you want to log out?</Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setLogoutDialog(false)} color="inherit">Cancel</Button>
                            <Button onClick={handleLogout} color="error" variant="contained">Logout</Button>
                        </DialogActions>
                    </Dialog>

                    <Snackbar
                        open={snackbar.open}
                        autoHideDuration={3000}
                        onClose={() => setSnackbar({ ...snackbar, open: false })}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        message={snackbar.message}
                    />
                </Box>
            </Box>
        </Box>
    );
}
