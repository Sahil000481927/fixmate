import React, { useEffect, useState } from 'react';
import {
    Box, Typography, CircularProgress, Button, Chip, useMediaQuery, useTheme, IconButton, Menu, MenuItem
} from '@mui/material';
import AppLayout from '../components/AppLayout';
import { useSnackbar } from '../components/FeedbackSnackbar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import api from "../api/ApiClient";
import UniversalDialog from '../components/UniversalDialog';
import UniversalFormFields from '../components/UniversalFormFields';
import Table from '../components/Table';
import Card from '../components/Card';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export default function TeamsPage() {
    const { showSnackbar } = useSnackbar();
    const [user] = useAuthState(auth);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [users, setUsers] = useState([]);
    const [pendingCounts, setPendingCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState({});
    // Dialog state for robust form handling
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogForm, setDialogForm] = useState({});
    const [dialogFields, setDialogFields] = useState([]);
    const [dialogTitle, setDialogTitle] = useState('');
    const [dialogAction, setDialogAction] = useState('');
    const [dialogLoading, setDialogLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [actionMenu, setActionMenu] = useState({ anchor: null, userId: null });
    const [currentUserId, setCurrentUserId] = useState(null);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const permRes = await api.get(`/users/${user.uid}/permissions`);
            setPermissions(permRes.data);

            const [usersRes, countsRes] = await Promise.all([
                api.get('/users', { meta: { permission: 'viewUsers' } }),
                api.get('/requests/pending-counts-by-user', { meta: { permission: 'viewRequests' } })
            ]);

            setUsers(usersRes.data);
            setPendingCounts(countsRes.data);
        } catch {
            showSnackbar('Failed to load team data', 'error');
        }
        setLoading(false);
    };

    useEffect(() => {
        if (user) fetchAllData();
    }, [user]);

    // Dialog open for role change
    const openDialog = (type, uid = '') => {
        setDialogAction(type);
        setCurrentUserId(uid);
        if (type === 'role') {
            setDialogFields([
                {
                    name: 'role',
                    label: 'Role',
                    type: 'select',
                    required: true,
                    options: [
                        { value: 'operator', label: 'Operator' },
                        { value: 'technician', label: 'Technician' },
                        { value: 'lead', label: 'Lead' },
                        { value: 'admin', label: 'Admin' }
                    ]
                }
            ]);
            setDialogForm({ role: '' });
            setDialogTitle('Change User Role');
        }
        setDialogOpen(true);
        setErrors({});
    };

    const handleDialogFormChange = (name, value, updatedForm) => {
        setDialogForm(updatedForm);
        setErrors({ ...errors, [name]: '' });
    };

    const handleDialogSave = async () => {
        setDialogLoading(true);
        try {
            if (dialogAction === 'role') {
                await api.patch(`/users/${currentUserId}/role`, { role: dialogForm.role }, {
                    meta: { permission: 'elevateRole' }
                });
                showSnackbar('User role updated successfully', 'success');
            }
            await fetchAllData();
            setDialogOpen(false);
            setDialogForm({});
            setDialogFields([]);
            setDialogTitle('');
            setDialogAction('');
            setCurrentUserId(null);
        } catch {
            showSnackbar('Failed to update user role', 'error');
        }
        setDialogLoading(false);
    };

    const handleDeleteUser = async (uid) => {
        if (!permissions.can_removeUser) {
            showSnackbar('You do not have permission to remove users', 'error');
            return;
        }
        if (uid === user.uid) {
            showSnackbar('You cannot delete your own account', 'error');
            return;
        }
        if (!window.confirm('Are you sure you want to delete this user?')) return;

        try {
            await api.delete(`/users/${uid}`, { meta: { permission: 'removeUser' } });
            showSnackbar('User deleted successfully', 'success');
            await fetchAllData();
        } catch {
            showSnackbar('Failed to delete user', 'error');
        }
    };

    const openActionMenu = (event, userId) => {
        setActionMenu({ anchor: event.currentTarget, userId });
    };

    const closeActionMenu = () => {
        setActionMenu({ anchor: null, userId: null });
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin': return 'error';
            case 'lead': return 'warning';
            case 'technician': return 'info';
            default: return 'default';
        }
    };

    const tableColumns = ['Name', 'Email', 'Role', 'Pending Requests', 'Actions'];
    const tableRows = users.map(u => ({
        Name: u.name || 'N/A',
        Email: u.email,
        Role: (
            <Chip
                size="small"
                label={u.role}
                color={getRoleColor(u.role)}
            />
        ),
        'Pending Requests': pendingCounts[u.uid] || 0,
        Actions: (permissions.can_elevateRole || permissions.can_removeUser) && (
            <IconButton
                size="small"
                onClick={(e) => openActionMenu(e, u.uid)}
            >
                <MoreVertIcon />
            </IconButton>
        )
    }));

    return (
        <AppLayout activeItem="Teams" title="Teams">
            {loading ? (
                <Box textAlign="center" mt={10}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {!isMobile ? (
                        <Table
                            columns={tableColumns}
                            rows={tableRows}
                            emptyMessage="No team members found."
                        />
                    ) : (
                        users.map(u => (
                            <Card
                                key={u.uid}
                                title={u.name || 'N/A'}
                                subtitle={`Email: ${u.email}`}
                                content={
                                    <>
                                        <Typography variant="body2">Role: {u.role}</Typography>
                                        <Typography variant="body2">Pending Requests: {pendingCounts[u.uid] || 0}</Typography>
                                    </>
                                }
                                actions={
                                    (permissions.can_elevateRole || permissions.can_removeUser) && (
                                        <IconButton
                                            size="small"
                                            onClick={(e) => openActionMenu(e, u.uid)}
                                        >
                                            <MoreVertIcon />
                                        </IconButton>
                                    )
                                }
                            />
                        ))
                    )}
                </>
            )}

            <Menu
                anchorEl={actionMenu.anchor}
                open={Boolean(actionMenu.anchor)}
                onClose={closeActionMenu}
            >
                {permissions.can_elevateRole && (
                    <MenuItem onClick={() => {
                        closeActionMenu();
                        openDialog('role', actionMenu.userId);
                    }}>
                        Change Role
                    </MenuItem>
                )}
                {permissions.can_removeUser && (
                    <MenuItem onClick={() => {
                        closeActionMenu();
                        handleDeleteUser(actionMenu.userId);
                    }}>
                        Remove User
                    </MenuItem>
                )}
            </Menu>

            <UniversalDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                title={dialogTitle}
                actions={[
                    { label: 'Save', color: 'primary', variant: 'contained', onClick: handleDialogSave, loading: dialogLoading },
                    { label: 'Cancel', onClick: () => setDialogOpen(false) }
                ]}
            >
                <UniversalFormFields
                    fields={dialogFields}
                    form={dialogForm}
                    errors={errors}
                    onChange={handleDialogFormChange}
                />
            </UniversalDialog>
        </AppLayout>
    );
}
