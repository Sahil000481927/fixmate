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
    const [requests, setRequests] = useState([]);
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });
    const [roleDialog, setRoleDialog] = useState({ open: false, user: null, newRole: '' });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });

    useEffect(() => {
        if (user) {
            const fetchRoleAndPermissions = async () => {
                try {
                    const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
                    const res = await axios.get(`${API}/api/users/${user.uid}/permissions`);
                    setUserRole(res.data.role || null);
                    setPermissions(res.data || {});
                } catch {
                    setUserRole(null);
                    setPermissions({});
                }
            };
            fetchRoleAndPermissions();
        }
    }, [user]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
                const [usersRes, requestsRes] = await Promise.all([
                    axios.get(`${API}/api/users`),
                    axios.get(`${API}/api/requests`),
                ]);
                setUsers(usersRes.data);
                setRequests(requestsRes.data);
            } catch (error) {
                setSnackbar({ open: true, message: 'Error fetching data' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getUserPendingRequests = (userId) => {
        return requests.filter(
            (req) => req.status === 'Pending' && req.createdBy === userId
        );
    };

    const toggleExpand = (userId) => {
        setExpandedUserId(prev => (prev === userId ? null : userId));
    };

    const handleRoleChange = async (userObj, newRole) => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            await axios.patch(`${API}/api/users/${userObj.uid}/role`, { role: newRole });
            setSnackbar({ open: true, message: 'Role updated!' });
            setUsers(users => users.map(u => u.uid === userObj.uid ? { ...u, role: newRole } : u));
        } catch {
            setSnackbar({ open: true, message: 'Failed to update role' });
        }
        setRoleDialog({ open: false, user: null, newRole: '' });
    };

    const handleDeleteUser = async (userObj) => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            await axios.delete(`${API}/api/users/${userObj.uid}`);
            setSnackbar({ open: true, message: 'User deleted!' });
            setUsers(users => users.filter(u => u.uid !== userObj.uid));
        } catch {
            setSnackbar({ open: true, message: 'Failed to delete user' });
        }
        setDeleteDialog({ open: false, user: null });
    };

    const canManageUsers = permissions.can_manage_users || userRole === 'admin' || userRole === 'lead';

    return (
        <AppLayout activeItem="teams">
            <MachineTypeInterrupter />
            <Box sx={{ p: { xs: 1, md: 3 }, width: '100%', maxWidth: 1200, mx: 'auto' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Team Members</Typography>
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
