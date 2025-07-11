import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableHead, TableRow,
    TableCell, TableBody, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Snackbar, Toolbar, AppBar,
    IconButton, useMediaQuery, Card, CardContent, CardHeader, Grid, Chip,
    Select, MenuItem, InputLabel, FormControl, CircularProgress
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useTheme } from '@mui/material/styles';
import { auth, rtdb } from '../firebase-config';
import { useAuthState } from 'react-firebase-hooks/auth';
import Sidebar from '../components/Sidebar';
import axios from 'axios';
import MachineTypeInterrupter from '../components/MachineTypeInterrupter';
import { ref as dbRef, onValue, get, push, update } from 'firebase/database';
import Autocomplete from '@mui/material/Autocomplete';
import { getIdToken } from 'firebase/auth';

const drawerWidth = 240;
const DEFAULT_MACHINE_TYPES = ['Lathe', 'Milling Machine', 'Drill Press', 'Grinder', 'CNC Machine'];

export default function MachinesPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });

    const [user] = useAuthState(auth);
    const [userRole, setUserRole] = useState(null);
    const [permissions, setPermissions] = useState({});

    const userName = user?.displayName || user?.email || 'User';
    const userPhoto = user?.photoURL || '/default-avatar.png';

    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ name: '', location: '', type: '' });
    const [machineTypes, setMachineTypes] = useState([]);
    const [typesLoading, setTypesLoading] = useState(true);

    // RTDB machine types fetch and live update
    useEffect(() => {
        setTypesLoading(true);
        const typesRef = dbRef(rtdb, 'machineTypes');
        const unsubscribe = onValue(typesRef, (snapshot) => {
            let types = [];
            if (snapshot.exists()) {
                types = Object.values(snapshot.val() || {});
            }
            setMachineTypes(types);
            setTypesLoading(false);
        }, () => setTypesLoading(false));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        fetchMachines();
        if (isMobile) setSidebarOpen(false);
        else setCollapsed(false);
    }, [isMobile]);

    useEffect(() => {
        if (user) {
            const fetchRoleAndPermissions = async () => {
                try {
                    const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
                    const res = await axios.get(`${API}/api/users/${user.uid}/permissions`);
                    setUserRole(res.data.role || null);
                    setPermissions(res.data || {});
                } catch {
                    setUserRole(null);
                    setPermissions({});
                }
            };
            fetchRoleAndPermissions();
        }
    }, [user]);

    const fetchMachines = async () => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            const idToken = user ? await getIdToken(user) : null;
            const res = await axios.get(`${API}/api/machines`, {
                headers: idToken ? { Authorization: `Bearer ${idToken}` } : {}
            });
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
            // Get Firebase ID token for secure backend auth
            const idToken = user ? await getIdToken(user) : null;
            const res = await axios.post(`${API}/api/machines`, {
                name: form.name,
                location: form.location,
                type: form.type,
                userId: user?.uid // Immediate fix: send UID
            }, {
                headers: idToken ? { Authorization: `Bearer ${idToken}` } : {}
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

    // For Autocomplete add logic
    const [typeInput, setTypeInput] = useState('');
    const [addingType, setAddingType] = useState(false);
    const handleAddNewType = async (type) => {
        setAddingType(true);
        try {
            const typesRef = dbRef(rtdb, 'machineTypes');
            const snapshot = await get(typesRef);
            let types = snapshot.exists() ? Object.values(snapshot.val() || {}) : [];
            if (!types.includes(type)) {
                const newKey = push(typesRef).key;
                await update(typesRef, { [newKey]: type });
            }
            setForm(f => ({ ...f, type }));
        } finally {
            setAddingType(false);
        }
    };

    // Helper to determine if we should use table or card view
    const isTableView = useMediaQuery(theme.breakpoints.up('md'));

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
                    <MachineTypeInterrupter />
                    {/* Responsive view: Table for large screens, Cards for small screens */}
                    {isTableView ? (
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
                    ) : (
                        <Grid container spacing={3}>
                            {machines.map((m) => (
                                <Grid item xs={12} sm={6} md={4} lg={3} key={m.id || m._id}>
                                    <Card sx={{ minWidth: 320 }}>
                                        <CardHeader title={m.name} subheader={m.location} />
                                        <CardContent>
                                            <Chip label={m.type} color="primary" />
                                            <Typography variant="body2" sx={{ mt: 1 }}>ID: {m.id || m._id}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                    {/* Dialog for new machine */}
                    <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                        <DialogTitle>Add Machine</DialogTitle>
                        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
                            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
                            <TextField label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} fullWidth />
                            <FormControl fullWidth>
                                <InputLabel>Type</InputLabel>
                                <Autocomplete
                                    freeSolo
                                    options={machineTypes}
                                    loading={typesLoading}
                                    value={form.type}
                                    inputValue={typeInput}
                                    onInputChange={(e, v) => setTypeInput(v)}
                                    onChange={(e, v) => {
                                        // If user types, always select the first value if not empty
                                        if (typeof v === 'string' && v === '' && machineTypes.length > 0) {
                                            setForm({ ...form, type: machineTypes[0] });
                                            setTypeInput(machineTypes[0]);
                                        } else {
                                            setForm({ ...form, type: v });
                                        }
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Type" />
                                    )}
                                    filterOptions={(options, state) => {
                                        // Hide placeholder, just show filtered options
                                        return options.filter(opt => opt.toLowerCase().includes(state.inputValue.toLowerCase()));
                                    }}
                                    getOptionLabel={option => typeof option === 'string' ? option : option.inputValue || ''}
                                    renderOption={(props, option, { index }) =>
                                        typeof option === 'string' ? (
                                            <li key={option} {...props}>{option}</li>
                                        ) : null
                                    }
                                />
                            </FormControl>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
                            <Button onClick={handleCreate} variant="contained" disabled={typesLoading}>Create</Button>
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
