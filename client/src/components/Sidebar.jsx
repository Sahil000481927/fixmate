import React from 'react';
import {
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Box,
    Typography,
    Avatar,
    Divider,
    useTheme,
} from '@mui/material';

import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BuildIcon from '@mui/icons-material/Build';
import DevicesIcon from '@mui/icons-material/Devices';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HistoryIcon from '@mui/icons-material/History';

const drawerWidth = 240;

const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Requests', icon: <AssignmentIcon />, path: '/requests' },
    { text: 'Assignments', icon: <BuildIcon />, path: '/assignments' },
    { text: 'Machines', icon: <DevicesIcon />, path: '/machines' },
    { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
    { text: 'History', icon: <HistoryIcon />, path: '/history' },
];

export default function Sidebar({
    open,
    variant,
    onClose,
    activeItem,
    userName = 'User Name',
    logoUrl = '/logo192.png',
}) {
    const theme = useTheme();

    return (
        <Drawer
            open={open}
            variant={variant}
            onClose={onClose}
            sx={{
                '& .MuiDrawer-paper': {
                    width: drawerWidth,
                    boxSizing: 'border-box',
                    background: theme.palette.background.default,
                    borderRight: `1.5px solid ${theme.palette.divider}`,
                    boxShadow: theme.shadows[2],
                },
            }}
        >
            <Toolbar />
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    px: 3,
                    pt: 3,
                    pb: 2,
                    gap: 2,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                        src={logoUrl}
                        alt="App Logo"
                        sx={{
                            width: 48,
                            height: 48,
                            bgcolor: theme.palette.primary.main,
                            boxShadow: theme.shadows[1],
                        }}
                    />
                    <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{
                            color: theme.palette.primary.main,
                            letterSpacing: 0.5,
                            fontSize: '1.3rem',
                        }}
                    >
                        {userName}
                    </Typography>
                </Box>
            </Box>
            <Divider sx={{ mx: 2, mb: 1, borderColor: theme.palette.divider }} />
            <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
                <List>
                    {navItems.map(({ text, icon, path }) => (
                        <ListItemButton
                            key={text}
                            selected={activeItem === text}
                            onClick={() => (window.location.href = path)}
                            sx={{
                                borderRadius: 2,
                                mb: 0.5,
                                px: 2,
                                py: 1.2,
                                cursor: 'pointer',
                                backgroundColor: activeItem === text
                                    ? theme.palette.primaryContainer?.main || theme.palette.action.selected
                                    : 'transparent',
                                color: activeItem === text
                                    ? theme.palette.primary.main
                                    : theme.palette.text.primary,
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                },
                                transition: 'background 0.2s, color 0.2s',
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    color: activeItem === text
                                        ? theme.palette.primary.main
                                        : theme.palette.text.secondary,
                                    minWidth: 36,
                                }}
                            >
                                {icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={text}
                                primaryTypographyProps={{
                                    fontWeight: activeItem === text ? 600 : 500,
                                    fontSize: '1rem',
                                }}
                            />
                        </ListItemButton>
                    ))}
                </List>
            </Box>
        </Drawer>
    );
}