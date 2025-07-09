import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableHead, TableRow,
    TableCell, TableBody, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Snackbar, Toolbar, AppBar,
    IconButton, useMediaQuery
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useTheme } from '@mui/material/styles';
import { auth } from '../firebase-config';
import { useAuthState } from 'react-firebase-hooks/auth';
import Sidebar from '../components/Sidebar';
import axios from 'axios';

const drawerWidth = 240;

export default function MachinesPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });

    const [user] = useAuthState(auth);
    const userName = user?.displayName || user?.email || 'User';
    const userPhoto = user?.photoURL || '/default-avatar.png';

    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ name: '', location: '', type: '' });

    useEffect(() => {
        fetchMachines();
        if (isMobile) setSidebarOpen(false);
        else setCollapsed(false);
    }, [isMobile]);

    const fetchMachines = async () => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            const res = await axios.get(`${API}/api/machines`);
            setMachines(res.data);
        } catch (err) {
            console.error(err);
            setSnackbar({ open: true, message: 'Failed to load machines' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            const res = await axios.post(`${API}/api/machines`, {
                name: form.name,
                location: form.location,
                type: form.type,
            });
            setSnackbar({ open: true, message: 'Machine created!' });
            setDialogOpen(false);
            setForm({ name: '', location: '', type: '' });
            fetchMachines();
        } catch (err) {
            console.error(err);
            setSnackbar({ open: true, message: 'Error creating machine' });
        }
    };

    return (
        <Box sx={{ display: 'flex' }}>
            {!collapsed && !isMobile && (
                <Sidebar
                    activeItem="Machines"
                    open={true}
                    variant="permanent"
                    onCollapse={() => setCollapsed(true)}
                    userName={userName}
                    logoUrl={userPhoto}
                />
            )}
            {isMobile && (
                <Sidebar
                    activeItem="Machines"
                    open={sidebarOpen}
                    variant="temporary"
                    onClose={() => setSidebarOpen(false)}
                    onCollapse={() => setSidebarOpen(false)}
                    userName={userName}
                    logoUrl={userPhoto}
                />
            )}

            <Box sx={{ flexGrow: 1, marginLeft: !isMobile && !collapsed ? `${drawerWidth}px` : 0 }}>
                <AppBar
                    position="fixed"
                    sx={{
                        zIndex: theme.zIndex.drawer + 1,
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        boxShadow: 'none',
                        width: !isMobile && !collapsed ? `calc(100% - ${drawerWidth}px)` : '100%',
                        left: !isMobile && !collapsed ? `${drawerWidth}px` : 0,
                    }}
                >
                    <Toolbar>
                        {(isMobile || collapsed) && (
                            <IconButton edge="start" onClick={() => isMobile ? setSidebarOpen(true) : setCollapsed(false)}>
                                <MenuIcon />
                            </IconButton>
                        )}
                        <Typography variant="h6" noWrap>
                            Machine Management
                        </Typography>
                    </Toolbar>
                </AppBar>

                <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
                    <Toolbar />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h5" fontWeight={600}>Machines</Typography>
                        <Button variant="contained" onClick={() => setDialogOpen(true)}>+ Add Machine</Button>
                    </Box>

                    <Paper>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>ID</TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Location</TableCell>
                                    <TableCell>Type</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {machines.map((m) => (
                                    <TableRow key={m.id || m._id}>
                                        <TableCell>{m.id || m._id}</TableCell>
                                        <TableCell>{m.name}</TableCell>
                                        <TableCell>{m.location}</TableCell>
                                        <TableCell>{m.type}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>

                    {/* Dialog for new machine */}
                    <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
                        <DialogTitle>Add Machine</DialogTitle>
                        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
                            <TextField label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} fullWidth />
                            <TextField label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} fullWidth />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
                            <Button onClick={handleCreate} variant="contained">Create</Button>
                        </DialogActions>
                    </Dialog>

                    <Snackbar
                        open={snackbar.open}
                        autoHideDuration={3000}
                        onClose={() => setSnackbar({ ...snackbar, open: false })}
                        message={snackbar.message}
                    />
                </Box>
            </Box>
        </Box>
    );
}
