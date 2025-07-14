import React, { useEffect, useState } from 'react';
import {
    Box, Typography, CircularProgress, Paper, Chip, Button, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AppLayout from '../components/AppLayout';
import { useSnackbar } from '../components/FeedbackSnackbar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from "../api/ApiClient";
import Card from '../components/Card';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import TableRowsIcon from '@mui/icons-material/TableRows';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useNavigate } from 'react-router-dom';

const columns = ['Pending', 'In Progress', 'Completed'];

export default function RequestBoardPage() {
    const [user] = useAuthState(auth);
    const { showSnackbar } = useSnackbar();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();

    const [requests, setRequests] = useState([]);
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState({});
    const [anchorEl, setAnchorEl] = useState(null);
    const [menuRequest, setMenuRequest] = useState(null);

    const fetchPermissions = async () => {
        try {
            const res = await api.get(`/users/${user.uid}/permissions`);
            setPermissions(res.data);
        } catch {
            showSnackbar('Failed to fetch permissions', 'error');
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await api.get(`/requests/requests-by-role`, {
                meta: { permission: 'viewAllRequests' },
                params: { userId: user.uid }
            });
            setRequests(res.data);
        } catch {
            showSnackbar('Failed to fetch requests', 'error');
        }
    };

    const fetchMachines = async () => {
        try {
            const res = await api.get(`/machines`, { meta: { permission: 'viewMachines' } });
            setMachines(res.data);
        } catch {
            showSnackbar('Failed to fetch machines', 'error');
        }
    };

    useEffect(() => {
        if (!user) return; // Only fetch if user is authenticated
        const fetchData = async () => {
            setLoading(true);
            await fetchPermissions();
            await Promise.all([fetchRequests(), fetchMachines()]);
            setLoading(false);
        };
        fetchData();
    }, [user]);

    const grouped = columns.reduce((acc, col) => {
        acc[col] = requests
            .filter(r => (r.status === 'Done' ? 'Completed' : r.status) === col)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest on top
        return acc;
    }, {});

    const getMachineName = (id) => machines.find(m => m.id === id)?.name || id;

    const onDragEnd = async ({ destination, source, draggableId }) => {
        if (!destination || destination.droppableId === source.droppableId) return;
        if (!permissions.can_updateRequest) {
            showSnackbar('You do not have permission to change request status', 'error');
            return;
        }
        const newStatus = destination.droppableId;

        // Optimistic UI update
        setRequests(prev =>
            prev.map(r => (r.id === draggableId ? { ...r, status: newStatus } : r))
        );

        try {
            await api.patch(`/requests/${draggableId}/status`, { status: newStatus }, {
                meta: { permission: 'updateRequestStatus' }
            });
            showSnackbar('Request status updated', 'success');
        } catch {
            showSnackbar('Failed to update status', 'error');
            await fetchRequests();
        }
    };

    // Card menu handlers
    const handleMenuOpen = (event, request) => {
        setAnchorEl(event.currentTarget);
        setMenuRequest(request);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuRequest(null);
    };
    const handleEdit = () => {
        // TODO: Implement edit dialog/modal
        showSnackbar('Edit not implemented yet', 'info');
        handleMenuClose();
    };
    const handleDelete = async () => {
        if (!permissions.can_deleteRequest) return;
        try {
            await api.delete(`/requests/${menuRequest.id}`, { meta: { permission: 'deleteRequest' } });
            showSnackbar('Request deleted successfully', 'success');
            await fetchRequests();
        } catch {
            showSnackbar('Failed to delete request', 'error');
        }
        handleMenuClose();
    };
    const handleRequestDelete = async () => {
        if (!permissions.can_requestDeleteRequest) return;
        try {
            await api.post(`/requests/${menuRequest.id}/request-delete`, {}, { meta: { permission: 'requestDeleteRequest' } });
            showSnackbar('Request deletion requested', 'success');
            await fetchRequests();
        } catch {
            showSnackbar('Failed to request deletion', 'error');
        }
        handleMenuClose();
    };

    const canDrag = permissions.can_updateRequest;

    return (
        <AppLayout activeItem="Requests" title="Requests Board">
            <Box sx={{
                width: '100%',
                minHeight: '100vh',
                background: theme => theme.palette.mode === 'dark' ? theme.palette.grey[900] : '#f4f6fa',
                py: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}>
                {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{
                        width: '100%',
                        maxWidth: 1400,
                        px: { xs: 1, sm: 2, md: 4 },
                        overflowX: 'auto',
                        display: 'flex',
                        justifyContent: 'center',
                    }}>
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Box sx={{
                                display: 'flex',
                                gap: 2,
                                width: '100%',
                                minWidth: 900,
                                flexWrap: { xs: 'nowrap', md: 'wrap' },
                                justifyContent: 'center',
                            }}>
                                {columns.map(col => (
                                    <Droppable
                                        droppableId={col}
                                        key={col}
                                        isDropDisabled={!canDrag}
                                    >
                                        {(provided) => (
                                            <Paper
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                sx={{
                                                    flex: '1 1 320px',
                                                    minWidth: 280,
                                                    maxWidth: 400,
                                                    background: theme => theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#fff',
                                                    borderRadius: 3,
                                                    p: 2,
                                                    boxShadow: 3,
                                                    minHeight: 500,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                }}
                                            >
                                                <Typography variant="h6" fontWeight={600} mb={2} sx={{ color: theme => theme.palette.text.primary }}>{col}</Typography>
                                                {grouped[col]?.map((req, index) => (
                                                    <Draggable
                                                        key={req.id}
                                                        draggableId={req.id}
                                                        index={index}
                                                        isDragDisabled={!canDrag}
                                                    >
                                                        {(provided, snapshot) => (
                                                            <Box
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                sx={{
                                                                    mb: 2,
                                                                    opacity: snapshot.isDragging ? 0.7 : 1,
                                                                }}
                                                            >
                                                                <Card
                                                                    title={req.title}
                                                                    subtitle={`Machine: ${getMachineName(req.machineId)}`}
                                                                    content={<Typography variant="body2">{req.description}</Typography>}
                                                                    status={req.status}
                                                                    priority={req.priority}
                                                                    actions={
                                                                        <IconButton size="small" onClick={e => handleMenuOpen(e, req)}>
                                                                            <MoreVertIcon />
                                                                        </IconButton>
                                                                    }
                                                                />
                                                                <Menu
                                                                    anchorEl={anchorEl}
                                                                    open={Boolean(anchorEl) && menuRequest?.id === req.id}
                                                                    onClose={handleMenuClose}
                                                                >
                                                                    {permissions.can_updateRequest && (
                                                                        <MenuItem onClick={handleEdit}>Edit</MenuItem>
                                                                    )}
                                                                    {permissions.can_deleteRequest && (
                                                                        <MenuItem onClick={handleDelete}>Delete</MenuItem>
                                                                    )}
                                                                    {!permissions.can_deleteRequest && permissions.can_requestDeleteRequest && (
                                                                        <MenuItem onClick={handleRequestDelete}>Request Delete</MenuItem>
                                                                    )}
                                                                </Menu>
                                                            </Box>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </Paper>
                                        )}
                                    </Droppable>
                                ))}
                            </Box>
                        </DragDropContext>
                    </Box>
                )}
            </Box>
        </AppLayout>
    );
}
