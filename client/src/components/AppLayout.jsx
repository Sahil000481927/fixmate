import React, {useEffect, useState} from 'react';
import Sidebar from './Sidebar';
import {useAuthState} from 'react-firebase-hooks/auth';
import {auth} from '../firebase-config';
import {AppBar, Box, CssBaseline, IconButton, Toolbar, useMediaQuery, useTheme} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

const drawerWidth = 240;

export default function AppLayout({children, activeItem}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [user] = useAuthState(auth);

    // Collapsed state for large screens
    const [collapsed, setCollapsed] = useState(false);
    // Sidebar open state for mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Reset collapsed/open state on screen size change
    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false);
        } else {
            setCollapsed(false);
        }
    }, [isMobile]);

    const userName = user?.displayName || user?.email || 'User';
    const userPhoto = user?.photoURL || '/default-avatar.png';

    return (
        <Box sx={{display: 'flex'}}>
            <CssBaseline/>
            <AppBar
                position="fixed"
                sx={{
                    zIndex: theme.zIndex.drawer + 1,
                    background: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    boxShadow: 'none',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }}
            >
                <Toolbar>
                    {/* Hamburger only on mobile or when collapsed on desktop */}
                    {(isMobile || collapsed) && (
                        <IconButton
                            color="inherit"
                            edge="start"
                            onClick={() => isMobile ? setSidebarOpen(true) : setCollapsed(false)}
                            sx={{mr: 2}}
                        >
                            <MenuIcon/>
                        </IconButton>
                    )}
                    {/* App title or other content here */}
                </Toolbar>
            </AppBar>
            {/* Sidebar:
                - On mobile: temporary, controlled by sidebarOpen
                - On desktop: permanent, controlled by collapsed
            */}
            {!collapsed && !isMobile && (
                <Sidebar
                    activeItem={activeItem}
                    open={true}
                    variant="permanent"
                    onClose={() => {
                    }}
                    onCollapse={() => setCollapsed(true)}
                    userName={userName}
                    logoUrl={userPhoto}
                />
            )}
            {isMobile && (
                <Sidebar
                    activeItem={activeItem}
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
                <Toolbar/>
                {children}
            </Box>
        </Box>
    );
}