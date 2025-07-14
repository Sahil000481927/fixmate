import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Chip, CircularProgress, Button, useMediaQuery, IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AppLayout from '../components/AppLayout';
import { useSnackbar } from '../components/FeedbackSnackbar';
import api from '../api/ApiClient';
import UniversalDialog from '../components/UniversalDialog';
import UniversalFormFields from '../components/UniversalFormFields';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import Card from '../components/Card';
import Table from '../components/Table';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useNavigate } from 'react-router-dom';

export default function RequestListPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { showSnackbar } = useSnackbar();
    const [user] = useAuthState(auth);
    const navigate = useNavigate();

    const [requests, setRequests] = useState([]);
    const [machines, setMachines] = useState([]);
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
    const [anchorEl, setAnchorEl] = useState(null);
    const [menuRequest, setMenuRequest] = useState(null);

    // UniversalFormFields config for requests
    const requestFields = [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'machineId', label: 'Machine', type: 'select', required: true, options: machines.map(m => ({ value: m.id, label: m.name })) },
        { name: 'priority', label: 'Priority', type: 'select', required: true, options: [
            { value: 'Low', label: 'Low' },
            { value: 'Medium', label: 'Medium' },
            { value: 'High', label: 'High' },
            { value: 'Critical', label: 'Critical' }
        ] },
        { name: 'description', label: 'Description', type: 'text', multiline: true, minRows: 3 }
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            const permRes = await api.get(`/users/${user.uid}/permissions`);
            setPermissions(permRes.data);

            const [reqRes, machRes] = await Promise.all([
                api.get('/requests/requests-by-role', { meta: { permission: 'viewAllRequests' }, params: { userId: user.uid } }),
                api.get('/machines', { meta: { permission: 'viewMachines' } })
            ]);

            setRequests(reqRes.data);
            setMachines(machRes.data);
        } catch {
            showSnackbar('Failed to load requests or machines', 'error');
        }
        setLoading(false);
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    // Dialog open for create/edit
    const openDialog = (type, request = null) => {
        setDialogAction(type);
        if (type === 'edit') {
            setDialogFields(requestFields);
            setDialogForm({
                title: request.title,
                machineId: request.machineId,
                priority: request.priority,
                description: request.description
            });
            setDialogTitle('Edit Request');
        } else if (type === 'create') {
            setDialogFields(requestFields);
            setDialogForm({ title: '', machineId: '', priority: '', description: '' });
            setDialogTitle('New Request');
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
            if (dialogAction === 'edit') {
                await api.patch(`/requests/${menuRequest.id}`, dialogForm, { meta: { permission: 'updateRequest' } });
                showSnackbar('Request updated successfully', 'success');
            } else if (dialogAction === 'create') {
                await api.post(`/requests`, dialogForm, { meta: { permission: 'createRequest' } });
                showSnackbar('Request created successfully', 'success');
            }
            await fetchData();
            setDialogOpen(false);
            setDialogForm({});
            setDialogFields([]);
            setDialogTitle('');
            setDialogAction('');
        } catch {
            showSnackbar('Failed to save request', 'error');
        }
        setDialogLoading(false);
    };

    const getMachineName = (id) => machines.find(m => m.id === id)?.name || id;

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'warning';
            case 'In Progress': return 'info';
            case 'Completed': return 'success';
            default: return 'default';
        }
    };

    const handleMenuOpen = (event, request) => {
        setAnchorEl(event.currentTarget);
        setMenuRequest(request);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuRequest(null);
    };

    const handleDelete = async (request) => {
        if (!permissions.can_deleteRequest) return;
        setDialogLoading(true);
        try {
            await api.delete(`/requests/${request.id}`, { meta: { permission: 'deleteRequest' } });
            showSnackbar('Request deleted successfully', 'success');
            await fetchData();
        } catch {
            showSnackbar('Failed to delete request', 'error');
        }
        setDialogLoading(false);
    };
    const handleRequestDelete = async (request) => {
        if (!permissions.can_requestDeleteRequest) return;
        setDialogLoading(true);
        try {
            await api.post(`/requests/${request.id}/request-delete`, {}, { meta: { permission: 'requestDeleteRequest' } });
            showSnackbar('Request deletion requested', 'success');
            await fetchData();
        } catch {
            showSnackbar('Failed to request deletion', 'error');
        }
        setDialogLoading(false);
    };

    // Add Kanban/List toggle and Add Request buttons to the top bar
    const actions = <>
        <Button
            color="primary"
            variant="contained"
            size="small"
            sx={{ mr: 1, textTransform: 'none' }}
            onClick={() => openDialog('create')}
            disabled={!permissions.can_createRequest}
        >
            Add Request
        </Button>
        <Button
            color="secondary"
            variant="outlined"
            size="small"
            sx={{ textTransform: 'none' }}
            onClick={() => navigate('/requests/board')}
        >
            Kanban View
        </Button>
    </>;

    return (
        <AppLayout title="Requests" activeItem="Requests" actions={actions}>
            <Box sx={{ p: isMobile ? 1 : 2, pt: isMobile ? 1 : 2, mt: isMobile ? 0 : 1 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    isMobile ? (
                        <Box display="flex" flexDirection="column" gap={2}>
                            {requests.length === 0 ? (
                                <Card title="No Requests" subtitle="" content={<Typography>No requests found.</Typography>} />
                            ) : (
                                requests.map((req) => (
                                    <Card
                                        key={req.id}
                                        title={req.title}
                                        subtitle={`Machine: ${getMachineName(req.machineId)}`}
                                        content={
                                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                                                {req.description}
                                            </Typography>
                                        }
                                        status={req.status}
                                        priority={req.priority}
                                        actions={
                                            <IconButton size="small" onClick={e => handleMenuOpen(e, req)}>
                                                <MoreVertIcon />
                                            </IconButton>
                                        }
                                    />
                                ))
                            )}
                        </Box>
                    ) : (
                        <Box mt={0}>
                            <Table
                                columns={["Title", "Machine", "Priority", "Status", "Actions"]}
                                rows={requests.map((req) => ({
                                    Title: req.title,
                                    Machine: getMachineName(req.machineId),
                                    Priority: (
                                        <Chip
                                            label={req.priority}
                                            color={{
                                                Low: 'default',
                                                Medium: 'info',
                                                High: 'warning',
                                                Critical: 'error'
                                            }[req.priority]}
                                            size="small"
                                        />
                                    ),
                                    Status: (
                                        <Chip
                                            label={req.status}
                                            color={getStatusColor(req.status)}
                                            size="small"
                                        />
                                    ),
                                    Actions: (
                                        <>
                                            <IconButton size="small" onClick={e => handleMenuOpen(e, req)}>
                                                <MoreVertIcon />
                                            </IconButton>
                                            <Menu
                                                anchorEl={anchorEl}
                                                open={Boolean(anchorEl) && menuRequest?.id === req.id}
                                                onClose={handleMenuClose}
                                            >
                                                {permissions.can_updateRequest && (
                                                    <MenuItem onClick={() => { handleMenuClose(); openDialog('edit', req); }}>Edit</MenuItem>
                                                )}
                                                {permissions.can_deleteRequest && (
                                                    <MenuItem onClick={() => { handleMenuClose(); handleDelete(req); }}>Delete</MenuItem>
                                                )}
                                                {!permissions.can_deleteRequest && permissions.can_requestDeleteRequest && (
                                                    <MenuItem onClick={() => { handleMenuClose(); handleRequestDelete(req); }}>Request Delete</MenuItem>
                                                )}
                                            </Menu>
                                        </>
                                    )
                                }))}
                            />
                        </Box>
                    )
                )}
            </Box>
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
