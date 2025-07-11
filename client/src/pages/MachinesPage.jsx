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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useSnackbar } from '../components/FeedbackSnackbar';

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

    // Edit dialog state
    const [editDialog, setEditDialog] = useState({ open: false, machine: null });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, machine: null });

    const { showSnackbar } = useSnackbar();

    // Fetch machine types directly from RTDB (not backend API)
    useEffect(() => {
        if (!user) return;
        setTypesLoading(true);
        const typesRef = dbRef(rtdb, 'machineTypes');
        const unsubscribe = onValue(typesRef, (snapshot) => {
            let types = [];
            if (snapshot.exists()) {
                // Support both { key: { name: 'Lathe' } } and { key: 'Lathe' }
                types = Object.values(snapshot.val() || {}).map(t => typeof t === 'string' ? t : t.name);
            }
            setMachineTypes(types);
            setTypesLoading(false);
        }, () => setTypesLoading(false));
        return () => unsubscribe();
    }, [user]);

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
                    const token = await user.getIdToken();
                    const res = await axios.get(`${API}/api/users/${user.uid}/permissions`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
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
            if (!user) return;
            const token = await user.getIdToken();
            const res = await axios.get(`${API}/api/machines`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMachines(res.data);
        } catch (err) {
            showSnackbar('Failed to load machines', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            if (!user) return;
            const token = await user.getIdToken();
            // Only send the form fields, do not prefill from any machine
            const res = await axios.post(`${API}/api/machines`, {
                name: form.name,
                location: form.location,
                type: form.type,
                userId: user?.uid
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showSnackbar('Machine created!', 'success');
            setDialogOpen(false);
            setForm({ name: '', location: '', type: '' }); // Reset form to blank after add
            fetchMachines();
        } catch (err) {
            showSnackbar('Error creating machine', 'error');
        }
    };

    // For Autocomplete add logic
    const [typeInput, setTypeInput] = useState('');
    const [addingType, setAddingType] = useState(false);
    // Add new machine type via backend API if not exists
    const handleAddNewType = async (type) => {
        setAddingType(true);
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$|$/, '');
            const idToken = user ? await getIdToken(user) : null;
            // Add type if not present
            if (!machineTypes.includes(type)) {
                await axios.post(`${API}/api/machines/types`, { name: type }, {
                    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {}
                });
                // Refetch types
                const res = await axios.get(`${API}/api/machines/types`, {
                    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {}
                });
                setMachineTypes(res.data || []);
            }
            setForm(f => ({ ...f, type }));
        } catch {
            setSnackbar({ open: true, message: 'Failed to add machine type' });
        } finally {
            setAddingType(false);
        }
    };

    // Edit machine handler
    const handleEdit = (machine) => {
        setEditDialog({ open: true, machine });
        setForm({ name: machine.name, location: machine.location, type: machine.type });
    };

    const handleUpdate = async () => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            if (!user) return;
            const token = await user.getIdToken();
            await axios.put(`${API}/api/machines/${editDialog.machine.id}`, {
                name: form.name,
                location: form.location,
                type: form.type,
                userId: user?.uid
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showSnackbar('Machine updated!', 'success');
            setEditDialog({ open: false, machine: null });
            setForm({ name: '', location: '', type: '' });
            fetchMachines();
        } catch (err) {
            showSnackbar('Error updating machine', 'error');
        }
    };

    // Delete machine handler
    const handleDelete = (machine) => {
        setDeleteDialog({ open: true, machine });
    };

    const confirmDelete = async () => {
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            if (!user) return;
            const token = await user.getIdToken();
            await axios.delete(`${API}/api/machines/${deleteDialog.machine.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showSnackbar('Machine deleted!', 'success');
            setDeleteDialog({ open: false, machine: null });
            fetchMachines();
        } catch (err) {
            showSnackbar('Error deleting machine', 'error');
        }
    };

    // Helper to determine if we should use table or card view
    const isTableView = useMediaQuery(theme.breakpoints.up('md'));

    // Helper for Autocomplete options
    const getAutocompleteOptions = (options, inputValue) => {
        const filtered = options.filter(opt =>
            typeof opt === 'string' && opt.toLowerCase().includes((inputValue || '').toLowerCase())
        );
        if (
            inputValue &&
            !options.map(opt => (typeof opt === 'string' ? opt.toLowerCase() : '')).includes(inputValue.toLowerCase())
        ) {
            filtered.push({ inputValue, add: true });
        }
        return filtered;
    };

    // When opening the add dialog, always clear the form
    const openAddDialog = () => {
        setForm({ name: '', location: '', type: '' });
        setDialogOpen(true);
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
                        {permissions.can_create_machine && (
                            <Button variant="contained" onClick={openAddDialog}>+ Add Machine</Button>
                        )}
                    </Box>
                    <MachineTypeInterrupter />
                    {/* Responsive view: Table for large screens, Cards for small screens */}
                    {isTableView ? (
                        <Paper>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Location</TableCell>
                                        <TableCell>Type</TableCell>
                                        {(permissions.can_update_machine || permissions.can_delete_machine) && <TableCell>Actions</TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {machines.map((m) => (
                                        <TableRow key={m.id || m._id}>
                                            <TableCell>{m.name}</TableCell>
                                            <TableCell>{m.location}</TableCell>
                                            <TableCell>{m.type}</TableCell>
                                            {(permissions.can_update_machine || permissions.can_delete_machine) && (
                                                <TableCell>
                                                    {permissions.can_update_machine && (
                                                        <IconButton onClick={() => handleEdit(m)} size="small"><EditIcon /></IconButton>
                                                    )}
                                                    {permissions.can_delete_machine && (
                                                        <IconButton onClick={() => handleDelete(m)} size="small" color="error"><DeleteIcon /></IconButton>
                                                    )}
                                                </TableCell>
                                            )}
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
                                <Autocomplete
                                    freeSolo
                                    options={machineTypes}
                                    loading={typesLoading || addingType}
                                    value={form.type}
                                    inputValue={typeInput}
                                    onInputChange={(e, v) => setTypeInput(v)}
                                    onChange={async (e, v) => {
                                        if (v && typeof v === 'object' && v.add && v.inputValue) {
                                            await handleAddNewType(v.inputValue);
                                            setTypeInput(v.inputValue);
                                        } else {
                                            setForm({ ...form, type: v });
                                            setTypeInput(v || '');
                                        }
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Type" placeholder="" />
                                    )}
                                    filterOptions={(options, state) => getAutocompleteOptions(options, state.inputValue)}
                                    getOptionLabel={option =>
                                        typeof option === 'string' ? option : option.inputValue || ''
                                    }
                                    renderOption={(props, option) =>
                                        typeof option === 'string' ? (
                                            <li {...props}>{option}</li>
                                        ) : option.add ? (
                                            <li {...props} style={{ display: 'flex', alignItems: 'center', color: '#1976d2' }}>
                                                <AddIcon fontSize="small" style={{ marginRight: 8 }} />
                                                Add "{option.inputValue}" to Machine types
                                            </li>
                                        ) : null
                                    }
                                />
                            </FormControl>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
                            <Button onClick={handleCreate} variant="contained" disabled={typesLoading || addingType || !form.name || !form.location || !form.type}>Create</Button>
                        </DialogActions>
                    </Dialog>
                    {/* Edit Machine Dialog */}
                    <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, machine: null })} maxWidth="sm" fullWidth>
                        <DialogTitle>Edit Machine</DialogTitle>
                        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
                            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
                            <TextField label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} fullWidth />
                            <FormControl fullWidth>
                                <Autocomplete
                                    freeSolo
                                    options={machineTypes}
                                    loading={typesLoading || addingType}
                                    value={form.type}
                                    inputValue={typeInput}
                                    onInputChange={(e, v) => setTypeInput(v)}
                                    onChange={async (e, v) => {
                                        if (v && typeof v === 'object' && v.add && v.inputValue) {
                                            await handleAddNewType(v.inputValue);
                                            setTypeInput(v.inputValue);
                                        } else {
                                            setForm({ ...form, type: v });
                                            setTypeInput(v || '');
                                        }
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Type" placeholder="" />
                                    )}
                                    filterOptions={(options, state) => getAutocompleteOptions(options, state.inputValue)}
                                    getOptionLabel={option =>
                                        typeof option === 'string' ? option : option.inputValue || ''
                                    }
                                    renderOption={(props, option) =>
                                        typeof option === 'string' ? (
                                            <li {...props}>{option}</li>
                                        ) : option.add ? (
                                            <li {...props} style={{ display: 'flex', alignItems: 'center', color: '#1976d2' }}>
                                                <AddIcon fontSize="small" style={{ marginRight: 8 }} />
                                                Add "{option.inputValue}" to Machine types
                                            </li>
                                        ) : null
                                    }
                                />
                            </FormControl>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setEditDialog({ open: false, machine: null })} color="inherit">Cancel</Button>
                            <Button onClick={handleUpdate} variant="contained" disabled={typesLoading || addingType || !form.name || !form.location || !form.type}>Update</Button>
                        </DialogActions>
                    </Dialog>
                    {/* Delete Machine Dialog */}
                    <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, machine: null })}>
                        <DialogTitle>Delete Machine</DialogTitle>
                        <DialogContent>
                            <Typography>Are you sure you want to delete the machine "{deleteDialog.machine?.name}"?</Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeleteDialog({ open: false, machine: null })} color="inherit">Cancel</Button>
                            <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
                        </DialogActions>
                    </Dialog>
                    {/* Error fallback for blank screen */}
                    {(!loading && machines.length === 0 && permissions.can_view_machines) && (
                        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
                            No machines found.
                        </Typography>
                    )}
                    {(!loading && !permissions.can_view_machines) && (
                        <Typography color="error" sx={{ mt: 4, textAlign: 'center' }}>
                            You do not have permission to view machines.
                        </Typography>
                    )}
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
