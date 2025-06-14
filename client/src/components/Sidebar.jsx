import React from 'react';
import {
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Box,
} from '@mui/material';

import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BuildIcon from '@mui/icons-material/Build';
import DevicesIcon from '@mui/icons-material/Devices';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HistoryIcon from '@mui/icons-material/History';

const drawerWidth = 220;

const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Requests', icon: <AssignmentIcon />, path: '/requests' },
    { text: 'Assignments', icon: <BuildIcon />, path: '/assignments' },
    { text: 'Machines', icon: <DevicesIcon />, path: '/machines' },
    { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
    { text: 'History', icon: <HistoryIcon />, path: '/history' },
];

export default function Sidebar({ open, variant, onClose, activeItem }) {
    return (
        <Drawer
            open={open}
            variant={variant}
            onClose={onClose}
            sx={{
                '& .MuiDrawer-paper': {
                    width: 240,
                    boxSizing: 'border-box',
                },
            }}
        >
            <Toolbar />
            <Box sx={{ overflow: 'auto' }}>
                <List>
                    {navItems.map(({ text, icon, path }) => (
                        <ListItem
                            button
                            key={text}
                            selected={activeItem === text}
                            onClick={() => (window.location.href = path)} // replace with navigate() if routing hooked
                        >
                            <ListItemIcon>{icon}</ListItemIcon>
                            <ListItemText primary={text} />
                        </ListItem>
                    ))}
                </List>
            </Box>
        </Drawer>
    );
}
