import React, { useEffect, useState, useRef } from 'react';
import {
    Box, Typography, CircularProgress, IconButton, Button, Chip,
    useMediaQuery, Menu, MenuItem
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AppLayout from '../components/AppLayout';
import { useSnackbar } from '../components/FeedbackSnackbar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import api from '../api/ApiClient';
import UniversalDialog from '../components/UniversalDialog';
import Card from '../components/Card';
import Table from '../components/Table';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DoneIcon from '@mui/icons-material/Done';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

export default function NotificationsPage() {
    const { showSnackbar } = useSnackbar();
    const [user] = useAuthState(auth);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const { notifications, unreadCount, loading } = useRealtimeNotifications();
    const [permissions, setPermissions] = useState({});
    const [actionMenu, setActionMenu] = useState({ anchor: null, notificationId: null });
    const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });

    const openActionMenu = (event, notificationId) => {
        setActionMenu({ anchor: event.currentTarget, notificationId });
    };

    const closeActionMenu = () => {
        setActionMenu({ anchor: null, notificationId: null });
    };

    const toggleRead = async (notificationId, currentStatus) => {
        try {
            await api.patch(`/notifications/update/${notificationId}`, { read: !currentStatus }, {
                meta: { permission: 'updateNotifications' }
            });
            showSnackbar(`Marked as ${!currentStatus ? 'read' : 'unread'}`, 'success');
        } catch {
            showSnackbar('Failed to update notification status', 'error');
        }
        closeActionMenu();
    };

    const handleDelete = async (notificationId) => {
        try {
            await api.delete(`/notifications/remove/${notificationId}`, { meta: { permission: 'deleteNotifications' } });
            showSnackbar('Notification deleted', 'success');
        } catch {
            showSnackbar('Failed to delete notification', 'error');
        }
        setConfirmDialog({ open: false, id: null });
    };

    const markAllAsRead = async () => {
        try {
            const unread = notifications.filter(n => !n.read);
            await Promise.all(unread.map(n => api.patch(`/notifications/update/${n.id}`, { read: true }, { meta: { permission: 'updateNotifications' } })));
            showSnackbar('All notifications marked as read', 'success');
        } catch {
            showSnackbar('Failed to mark all as read', 'error');
        }
    };

    const getStatusChip = (read) => (
        <Chip
            size="small"
            label={read ? 'Read' : 'Unread'}
            color={read ? 'default' : 'warning'}
        />
    );

    // Group notifications: unread first, then by day (2 days), month, quarter, year
    const groupNotifications = (notifications) => {
        const now = new Date();
        const groups = { Unread: [] };
        notifications.forEach(n => {
            if (!n.read) {
                groups.Unread.push(n);
                return;
            }
            const created = new Date(n.createdAt);
            const diffDays = (now - created) / (1000 * 60 * 60 * 24);
            let label = '';
            if (diffDays < 1) label = 'Today';
            else if (diffDays < 2) label = 'Yesterday';
            else if (now.getFullYear() === created.getFullYear() && now.getMonth() === created.getMonth()) label = now.toLocaleString('default', { month: 'long', year: 'numeric' });
            else if (now.getFullYear() === created.getFullYear() && Math.floor(now.getMonth() / 3) === Math.floor(created.getMonth() / 3)) label = `Q${Math.floor(created.getMonth() / 3) + 1} ${created.getFullYear()}`;
            else label = created.getFullYear().toString();
            if (!groups[label]) groups[label] = [];
            groups[label].push(n);
        });
        return groups;
    };

    // Intersection Observer for auto-mark as read with delay
    const observer = useRef();
    const notificationRefs = useRef({});
    // Track timers for each notification
    const timers = useRef({});
    useEffect(() => {
        if (!notifications.length) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new window.IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const id = entry.target.getAttribute('data-id');
                const notif = notifications.find(n => n.id === id);
                if (entry.isIntersecting && notif && !notif.read) {
                    // Start a timer for this notification
                    if (!timers.current[id]) {
                        timers.current[id] = setTimeout(() => {
                            // Only mark as read if still in view
                            if (observer.current && notificationRefs.current[id]) {
                                const rect = notificationRefs.current[id].getBoundingClientRect();
                                const inView = rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
                                if (inView) {
                                    toggleRead(id, false);
                                }
                            }
                            timers.current[id] = null;
                        }, 1200); // 1.2s delay
                    }
                } else {
                    // Not in view or already read, clear timer
                    if (timers.current[id]) {
                        clearTimeout(timers.current[id]);
                        timers.current[id] = null;
                    }
                }
            });
        }, { threshold: 0.7 });
        Object.values(notificationRefs.current).forEach(ref => {
            if (ref) observer.current.observe(ref);
        });
        return () => {
            if (observer.current) observer.current.disconnect();
            Object.values(timers.current).forEach(timer => timer && clearTimeout(timer));
            timers.current = {};
        };
    }, [notifications]);

    const grouped = groupNotifications(notifications);
    const groupOrder = ['Unread', 'Today', 'Yesterday'];
    Object.keys(grouped).forEach(label => {
        if (!groupOrder.includes(label)) groupOrder.push(label);
    });

    const getStatusIcon = (read) => read ? <DoneAllIcon color="primary" fontSize="small" /> : <DoneIcon color="disabled" fontSize="small" />;

    return (
        <AppLayout
            activeItem="Notifications"
            title="Notifications"
            actions={
                unreadCount > 0 && (
                    <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<DoneAllIcon />}
                        onClick={markAllAsRead}
                        sx={{ mr: 2 }}
                    >
                        Mark all as read
                    </Button>
                )
            }
        >
            {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%' }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        width: '100%',
                        mt: 2,
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: '100vw',
                            px: 0,
                        }}
                    >
                        <Timeline
                            position="right"
                            sx={{
                                mt: 0,
                                ml: 0,
                                mr: { xs: 8, sm: 16, md: 48, lg: 74 }, // Add margin right to push timeline to the right
                                pr: 0,
                                pl: 0,
                            }}
                        >
                            {groupOrder.map(label => grouped[label]?.length ? (
                                <TimelineItem key={label} sx={{width: '100%' }}>
                                    <TimelineSeparator>
                                        <TimelineDot color={label === 'Unread' ? 'warning' : 'primary'} />
                                        <TimelineConnector />
                                    </TimelineSeparator>
                                    <TimelineContent sx={{ width: '100%', pl: { xs: 2, sm: 4 }, pr: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <Typography variant="h6" sx={{ mb: 2, alignSelf: 'flex-start' }}>{label}</Typography>
                                        {grouped[label].map(n => (
                                            <Card
                                                key={n.id}
                                                ref={el => notificationRefs.current[n.id] = el}
                                                data-id={n.id}
                                                sx={{
                                                    mb: 2,
                                                    borderLeft: n.read ? '4px solid #90caf9' : '4px solid #ff9800',
                                                    background: n.read ? '#f5f5f5' : '#fffde7',
                                                    minWidth: { xs: 280, sm: 400, md: 600 },
                                                    maxWidth: { xs: '95vw', sm: 600, md: 900 },
                                                    width: '100%',
                                                    minHeight: 90,
                                                    borderRadius: 2,
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    py: 2,
                                                    px: 3,
                                                    boxShadow: 1,
                                                    alignSelf: 'flex-start',
                                                }}
                                                title={<Box display="flex" alignItems="center">{n.title} {getStatusIcon(n.read)}</Box>}
                                                subtitle={new Date(n.createdAt).toLocaleString()}
                                                content={<Typography variant="body2">{n.message}</Typography>}
                                                actions={
                                                    <>
                                                        <IconButton size="small" onClick={(e) => openActionMenu(e, n.id)}>
                                                            <MoreVertIcon />
                                                        </IconButton>
                                                    </>
                                                }
                                            />
                                        ))}
                                    </TimelineContent>
                                </TimelineItem>
                            ) : null)}
                        </Timeline>
                    </Box>
                </Box>
            )}
            <Menu
                anchorEl={actionMenu.anchor}
                open={Boolean(actionMenu.anchor)}
                onClose={closeActionMenu}
            >
                <MenuItem onClick={() => toggleRead(actionMenu.notificationId, notifications.find(n => n.id === actionMenu.notificationId).read)}>
                    {notifications.find(n => n.id === actionMenu.notificationId)?.read ? (
                        <><MarkEmailUnreadIcon fontSize="small" /> Mark as Unread</>
                    ) : (
                        <><MarkEmailReadIcon fontSize="small" /> Mark as Read</>
                    )}
                </MenuItem>
                {permissions.can_deleteNotifications && (
                    <MenuItem onClick={() => setConfirmDialog({ open: true, id: actionMenu.notificationId })}>
                        <DeleteIcon fontSize="small" /> Delete
                    </MenuItem>
                )}
            </Menu>
            <UniversalDialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog({ open: false, id: null })}
                onSubmit={() => handleDelete(confirmDialog.id)}
                title="Delete Notification"
                submitLabel="Delete"
                isSubmitting={false}
            >
                <Typography>Are you sure you want to delete this notification? This action cannot be undone.</Typography>
            </UniversalDialog>
        </AppLayout>
    );
}
