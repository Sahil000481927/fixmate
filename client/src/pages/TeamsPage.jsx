import React, { useEffect, useState } from 'react';
import {
    Box,
    CircularProgress,
    Paper,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Button,
    Collapse,
    List,
    ListItem,
    Divider,
    TableContainer,
    Select,
    MenuItem,
    IconButton,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
} from '@mui/material';
import AppLayout from '../components/AppLayout';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import axios from 'axios';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MachineTypeInterrupter from '../components/MachineTypeInterrupter';

export default function TeamsPage() {
    const [user] = useAuthState(auth);
    const [userRole, setUserRole] = useState(null);
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [requestCount, setRequestCount] = useState(null);
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });
    const [roleDialog, setRoleDialog] = useState({ open: false, user: null, newRole: '' });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });

    useEffect(() => {
        if (user) {
            const fetchRoleAndPermissions = async () => {
                try {
                    const API = import.meta.env.VITE_API_URL.replace(/\/+$|\/$/g, '');
                    const idToken = await user.getIdToken();
                    const res = await axios.get(`${API}/api/users/${user.uid}/permissions`, {
                        headers: { Authorization: `Bearer ${idToken}` }
                    });
                    setUserRole(res.data.role || null);
                    setPermissions(res.data || {});
                } catch {
                    setUserRole(null);
                    setPermissions({});
                    // No snackbar here, rely on global error handling
                }
            };
            fetchRoleAndPermissions();
        }
    }, [user]);

    // Only fetch users if the user has permission, and fetch request count if allowed
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const API = import.meta.env.VITE_API_URL.replace(/\/+$/g, '');
                let idToken = null;
                if (user) idToken = await user.getIdToken();
                let usersRes = { data: [] };
                let reqCountRes = { data: { count: 0 } };
                if (permissions.can_view_users) {
                    usersRes = await axios.get(`${API}/api/users`, idToken ? { headers: { Authorization: `Bearer ${idToken}` } } : {});
                }
                // Always fetch request count if allowed, do not filter by user
                if (permissions.can_count_requests) {
                    reqCountRes = await axios.get(`${API}/api/requests/count`, idToken ? { headers: { Authorization: `Bearer ${idToken}` } } : {});
                }
                setUsers(usersRes.data);
                setRequestCount(reqCountRes.data.count);
            } catch (error) {
                // Remove local snackbar, rely on global error handler in main.jsx
            } finally {
                setLoading(false);
            }
        };
        if (user && Object.keys(permissions).length > 0) {
            fetchData();
        }
    }, [user, permissions]);

    const toggleExpand = (userId) => {
        setExpandedUserId(prev => (prev === userId ? null : userId));
    };

    const handleRoleChange = async (userObj, newRole) => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$|\/$/g, '');
            const idToken = await user.getIdToken();
            await axios.patch(`${API}/api/users/${userObj.uid}/role`, { role: newRole }, {
                headers: { Authorization: `Bearer ${idToken}` }
            });
            setSnackbar({ open: true, message: 'Role updated!' });
            setUsers(users => users.map(u => u.uid === userObj.uid ? { ...u, role: newRole } : u));
        } catch {
            setSnackbar({ open: true, message: 'Failed to update role' });
        }
        setRoleDialog({ open: false, user: null, newRole: '' });
    };

    const handleDeleteUser = async (userObj) => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$|\/$/g, '');
            const idToken = await user.getIdToken();
            await axios.delete(`${API}/api/users/${userObj.uid}`, {
                headers: { Authorization: `Bearer ${idToken}` }
            });
            setSnackbar({ open: true, message: 'User deleted!' });
            setUsers(users => users.filter(u => u.uid !== userObj.uid));
        } catch {
            setSnackbar({ open: true, message: 'Failed to delete user' });
        }
        setDeleteDialog({ open: false, user: null });
    };

    // Helper to get pending requests for a user (stub: returns empty array, replace with real logic if needed)
    function getUserPendingRequests(userId) {
        // You can implement actual logic here if you have request data available
        return [];
    }

    // Use the new can_manage_users permission from backend, not just userRole
    const canManageUsers = permissions.can_manage_users;

    // Only render users table if can_view_users
    if (!permissions.can_view_users) {
        return (
            <AppLayout activeItem="teams">
                <Box sx={{ p: { xs: 1, md: 3 }, width: '100%', maxWidth: 1200, mx: 'auto' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Team Members</Typography>
                    <TableContainer component={Paper} elevation={3}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell>Pending Requests</TableCell>
                                    {permissions.can_manage_users && <TableCell>Actions</TableCell>}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {/* No rows if no permission */}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </AppLayout>
        );
    }

    // Show request count in the UI
    return (
        <AppLayout activeItem="teams">
            <MachineTypeInterrupter />
            <Box sx={{ p: { xs: 1, md: 3 }, width: '100%', maxWidth: 1200, mx: 'auto' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Team Members</Typography>
                {permissions.countRequests && (
                    <Typography sx={{ mb: 2 }}>
                        Total Requests: {requestCount !== null ? requestCount : <CircularProgress size={16} />}
                    </Typography>
                )}
                {loading ? (
                    <Box sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Box>
                ) : (
                    <TableContainer component={Paper} elevation={3}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell>Pending Requests</TableCell>
                                    {canManageUsers && <TableCell>Actions</TableCell>}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map((u) => (
                                    <TableRow key={u.uid}>
                                        <TableCell>{u.name || u.displayName || u.email}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>
                                            {canManageUsers ? (
                                                <FormControl size="small" variant="outlined">
                                                    <Select
                                                        value={u.role}
                                                        onChange={e => setRoleDialog({ open: true, user: u, newRole: e.target.value })}
                                                        disabled={u.uid === user?.uid}
                                                    >
                                                        <MenuItem value="operator">Operator</MenuItem>
                                                        <MenuItem value="technician">Technician</MenuItem>
                                                        <MenuItem value="lead">Lead</MenuItem>
                                                        <MenuItem value="admin">Admin</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            ) : (
                                                u.role
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {getUserPendingRequests(u.uid).length}
                                        </TableCell>
                                        {canManageUsers && (
                                            <TableCell>
                                                <IconButton color="error" onClick={() => setDeleteDialog({ open: true, user: u })} disabled={u.uid === user?.uid}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={3000}
                    onClose={() => setSnackbar({ open: false, message: '' })}
                    message={snackbar.message}
                />
                {/* Role Change Dialog */}
                <Dialog open={roleDialog.open} onClose={() => setRoleDialog({ open: false, user: null, newRole: '' })}>
                    <DialogTitle>Change Role</DialogTitle>
                    <DialogContent>
                        <Typography>Change role for {roleDialog.user?.name || roleDialog.user?.email} to {roleDialog.newRole}?</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setRoleDialog({ open: false, user: null, newRole: '' })}>Cancel</Button>
                        <Button onClick={() => handleRoleChange(roleDialog.user, roleDialog.newRole)} variant="contained">Confirm</Button>
                    </DialogActions>
                </Dialog>
                {/* Delete User Dialog */}
                <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })}>
                    <DialogTitle>Delete User</DialogTitle>
                    <DialogContent>
                        <Typography>Are you sure you want to delete {deleteDialog.user?.name || deleteDialog.user?.email}?</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteDialog({ open: false, user: null })}>Cancel</Button>
                        <Button onClick={() => handleDeleteUser(deleteDialog.user)} color="error" variant="contained">Delete</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AppLayout>
    );
}
