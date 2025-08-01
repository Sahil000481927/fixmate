import React, { useEffect, useState } from 'react';
import {
    Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Box,
    Divider, IconButton, Tooltip, useTheme, useMediaQuery
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import GroupIcon from '@mui/icons-material/Group';
import LogoutIcon from '@mui/icons-material/Logout';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import api from '../api/ApiClient';
import { useSnackbar } from './FeedbackSnackbar';

export default function Sidebar({ open, onClose, userPermissions, activeItem }) {
    const navigate = useNavigate();
    const [user] = useAuthState(auth);
    const { showSnackbar } = useSnackbar();
    const [unreadCount, setUnreadCount] = useState(0);
    const [userProfile, setUserProfile] = useState({ name: '', role: '' });
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        // Fetch user profile from RTDB for role
        async function fetchProfile() {
            if (user?.uid) {
                try {
                    const res = await api.get(`/users`);
                    const found = (res.data || []).find(u => u.uid === user.uid);
                    if (found) setUserProfile({ name: found.name || found.displayName || 'User', role: found.role || '' });
                } catch {
                    setUserProfile({ name: user.displayName || 'User', role: '' });
                }
            }
        }
        fetchProfile();
    }, [user]);

    const navItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', permission: 'viewDashboard' },
        { text: 'Requests', icon: <AssignmentIcon />, path: '/requests', permission: 'viewAllRequests' },
        { text: 'Assignments', icon: <AssignmentTurnedInIcon />, path: '/assignments', permission: 'getAssignmentsForUser' },
        { text: 'Machines', icon: <PrecisionManufacturingIcon />, path: '/machines', permission: 'viewMachines' },
        { text: 'Teams', icon: <GroupIcon />, path: '/teams', permission: 'viewUsers' },
        { text: 'Cashout', icon: <WorkOutlineIcon />, path: '/cashout', permission: 'requestCashout' },
    ];

    const handleNavigation = (path) => {
        navigate(path);
        if (onClose) onClose();
    };

    const fetchUnreadCount = async () => {
        try {
            if (user && userPermissions.can_viewNotifications) {
                const res = await api.get('/notifications/list', { meta: { permission: 'viewNotifications' } });
                const unread = res.data.filter(n => !n.read).length;
                setUnreadCount(unread);
            }
        } catch {
            showSnackbar('Failed to fetch notifications', 'error');
        }
    };

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/login');
    };

    // Sidebar collapse toggle handler
    const handleCollapseToggle = () => {
        setSidebarCollapsed((prev) => !prev);
        if (onClose) onClose();
    };

    useEffect(() => {
        fetchUnreadCount();
    }, [user]);

    return (
        <Drawer
            variant={open === true || open === false ? (onClose ? 'temporary' : 'permanent') : 'permanent'}
            open={open}
            onClose={onClose}
            sx={{
                '& .MuiDrawer-paper': {
                    width: sidebarCollapsed ? 72 : 240,
                    transition: 'width 0.3s',
                    boxSizing: 'border-box',
                    overflowX: 'hidden',
                },
            }}
        >
            <Toolbar sx={{ justifyContent: 'flex-end', minHeight: 56 }}>
                {isMobile && (
                    <IconButton onClick={handleCollapseToggle} size="small">
                        <span className="material-icons">menu</span>
                    </IconButton>
                )}
            </Toolbar>
            {/* User profile info */}
            <Box sx={{ px: 2, py: 1, mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <Box sx={{ fontWeight: 600, width: '100%' }}>{userProfile.name}</Box>
                <Box sx={{ fontSize: 13, color: 'text.secondary', width: '100%' }}>{userProfile.role ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1) : ''}</Box>
            </Box>
            <Divider />
            <List>
                {navItems.map(({ text, icon, path, permission }) => (
                    <Tooltip key={text} title={userPermissions[`can_${permission}`] ? '' : 'You may not have access to this page'} placement="right">
                        <ListItemButton
                            selected={activeItem === text}
                            onClick={() => handleNavigation(path)}
                        >
                            <ListItemIcon>{icon}</ListItemIcon>
                            <ListItemText primary={text} />
                        </ListItemButton>
                    </Tooltip>
                ))}
                <Divider />
                <ListItemButton onClick={handleLogout}>
                    <ListItemIcon><LogoutIcon color="error" /></ListItemIcon>
                    <ListItemText primary="Logout" />
                </ListItemButton>
            </List>
        </Drawer>
    );
}
