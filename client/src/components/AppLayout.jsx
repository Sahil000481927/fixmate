import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import {
    AppBar,
    Badge,
    Box,
    Button,
    CssBaseline,
    IconButton,
    Toolbar,
    Typography,
    useMediaQuery,
    useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HistoryIcon from '@mui/icons-material/History';
import { useLocation, useNavigate } from 'react-router-dom';
import BackButton from './BackButton';
import api from '../api/ApiClient';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

const drawerWidth = 240;

export default function AppLayout({ children, activeItem, title, permissions, actions, contentSx, mainButton }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [user] = useAuthState(auth);
    const location = useLocation();
    const navigate = useNavigate();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { unreadCount } = useRealtimeNotifications();

    // Remove back button from top nav, always show hamburger on mobile
    // Move sidebar margin only on desktop
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', background: theme.palette.background.default }}>
            <CssBaseline />
            <AppBar position="fixed" sx={{
                zIndex: theme.zIndex.drawer + 1,
                background: theme.palette.background.paper,
                color: theme.palette.text.primary,
                boxShadow: 'none',
                borderBottom: `1px solid ${theme.palette.divider}`,
            }}>
                <Toolbar>
                    <IconButton edge="start" onClick={() => setSidebarOpen(true)} sx={{ mr: 2 }}>
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {title || activeItem}
                    </Typography>
                    {mainButton && (
                        <Box sx={{ mr: 2 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={mainButton.onClick}
                                startIcon={mainButton.icon}
                                size="small"
                            >
                                {mainButton.label}
                            </Button>
                        </Box>
                    )}
                    {actions}
                    <IconButton onClick={() => navigate('/notifications')}>
                        <Badge badgeContent={unreadCount} color="error" invisible={unreadCount === 0}>
                            <NotificationsIcon />
                        </Badge>
                    </IconButton>
                    <IconButton onClick={() => navigate('/history')}><HistoryIcon /></IconButton>
                </Toolbar>
            </AppBar>
            {/* Sidebar as Drawer on mobile, permanent on desktop, always show hamburger */}
            {isMobile ? (
                <Sidebar
                    activeItem={activeItem}
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    userPermissions={permissions || {}}
                    user={user}
                />
            ) : (
                <Sidebar
                    activeItem={activeItem}
                    open={!sidebarCollapsed}
                    onClose={null}
                    userPermissions={permissions || {}}
                    user={user}
                    variant="permanent"
                />
            )}
            <Box component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    ml: { sm: `${drawerWidth}px` },
                    maxWidth: '100vw',
                    overflowX: 'auto',
                    ...contentSx
                }}
            >
                <Toolbar />
                {/* BackButton at top left of content */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BackButton />
                </Box>
                {children}
            </Box>
        </Box>
    );
}
