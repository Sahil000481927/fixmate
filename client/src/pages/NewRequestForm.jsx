import React, {useEffect, useState} from 'react';
import {
    AppBar,
    Box,
    Button,
    CircularProgress,
    Container,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    TextField,
    Toolbar,
    Typography,
    useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import {useTheme} from '@mui/material/styles';
import {useAuthState} from 'react-firebase-hooks/auth';
import {auth} from '../firebase-config';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const drawerWidth = 240;

export default function NewRequestForm() {
    const theme = useTheme();
    const [user] = useAuthState(auth);
    const [userRole, setUserRole] = useState(null);
    const [canSubmit, setCanSubmit] = useState(true);
    const [values, setValues] = useState({
        title: '',
        description: '',
        machineId: '',
        priority: '',
        technicianId: '',

    });
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [snack, setSnack] = useState('');
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const userName = user?.displayName || user?.email || 'User';
    const userPhoto = user?.photoURL || '/default-avatar.png';

    const [assignableUsers, setAssignableUsers] = useState([]);
    const [machines, setMachines] = useState([]);


    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false);
        } else {
            setCollapsed(false);
        }
    }, [isMobile]);

    const handleChange = (e) => {
        setValues((prev) => ({...prev, [e.target.name]: e.target.value}));
    };

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
        }
    };

    useEffect(() => {
        const fetchAssignableUsers = async () => {
            try {
                if (!user) return;
                const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
                const token = await user.getIdToken();
                const res = await axios.get(`${API}/api/requests/assignable-users`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAssignableUsers(res.data);
            } catch (err) {
                console.error('Error fetching assignable users:', err);
            }
        };
        if (user) fetchAssignableUsers();
    }, [user]);

    useEffect(() => {
        const fetchMachines = async () => {
            try {
                if (!user) return;
                const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
                const token = await user.getIdToken();
                const res = await axios.get(`${API}/api/machines`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMachines(res.data);
            } catch (err) {
                console.error('Error fetching machines:', err);
            }
        };
        if (user) fetchMachines();
    }, [user]);

    useEffect(() => {
        if (user) {
            const fetchRoleAndPermissions = async () => {
                try {
                    const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
                    const token = await user.getIdToken();
                    const res = await axios.get(`${API}/api/users/${user.uid}/permissions`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setUserRole(res.data.role || 'user');
                    setCanSubmit(res.data.can_submit_request !== false);
                } catch {
                    setUserRole('user');
                    setCanSubmit(true); // default allow
                }
            };
            fetchRoleAndPermissions();
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            const token = await user.getIdToken();
            const formData = new FormData();
            formData.append('title', values.title);
            formData.append('description', values.description);
            formData.append('machineId', values.machineId);
            formData.append('priority', values.priority);
            if (file) formData.append('photo', file);
            formData.append('createdBy', user.uid);
            formData.append('technicianId', values.technicianId);
            formData.append('createdAt', new Date().toISOString());
            await axios.post(`${API}/api/requests`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSnack('Request submitted!');
            setValues({title: '', description: '', machineId: '', priority: ''});
            setFile(null);
            setPreview(null);
        } catch (err) {
            setSnack('Error submitting request');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!canSubmit) return null;

    return (
        <Box sx={{display: 'flex'}}>
            {/* Sidebar */}
            {!collapsed && !isMobile && (
                <Sidebar
                    activeItem="Requests"
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
                    activeItem="Requests"
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
                <AppBar
                    position="fixed"
                    sx={{
                        zIndex: theme.zIndex.drawer + 1,
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        left: !isMobile && !collapsed ? `${drawerWidth}px` : 0,
                        width: !isMobile && !collapsed ? `calc(100% - ${drawerWidth}px)` : '100%',
                        transition: 'left 0.2s, width 0.2s',
                        boxShadow: 'none',
                    }}
                    elevation={0}
                >
                    <Toolbar>
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
                        <Typography variant="h6" noWrap>
                            New Maintenance Request
                        </Typography>
                    </Toolbar>
                </AppBar>
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 3,
                        bgcolor: theme.palette.background.default,
                        minHeight: '100vh',
                    }}
                >
                    <Toolbar/>
                    <Container maxWidth="sm">
                        <Paper
                            elevation={3}
                            sx={{
                                p: 4,
                                borderRadius: 3,
                                backgroundColor: theme.palette.background.paper,
                            }}
                        >
                            <Typography variant="h4" fontWeight={600} gutterBottom>
                                Submit Maintenance Request
                            </Typography>
                            <Box component="form" onSubmit={handleSubmit} noValidate sx={{mt: 2}}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Title"
                                    name="title"
                                    value={values.title}
                                    onChange={handleChange}
                                    sx={{mb: 2}}
                                />
                                <TextField
                                    fullWidth
                                    required
                                    multiline
                                    rows={4}
                                    label="Description"
                                    name="description"
                                    value={values.description}
                                    onChange={handleChange}
                                    sx={{mb: 2}}
                                />
                                <FormControl fullWidth sx={{mb: 2}}>
                                    <InputLabel>Machine</InputLabel>
                                    <Select
                                        name="machineId"
                                        value={values.machineId}
                                        onChange={handleChange}
                                        required
                                        label="Machine"
                                    >
                                        {machines.length === 0 ? (
                                            <MenuItem value="" disabled>No machines available</MenuItem>
                                        ) : (
                                            machines.map(machine => (
                                                <MenuItem key={machine._id || machine.id} value={machine._id || machine.id}>
                                                    {machine.name || machine.machineId || machine._id || machine.id}
                                                </MenuItem>
                                            ))
                                        )}
                                    </Select>
                                </FormControl>
                                <FormControl fullWidth sx={{ mb: 2 }}>
  <InputLabel>Assign To</InputLabel>
  <Select
    name="technicianId"
    value={values.technicianId}
    onChange={handleChange}
    label="Assign To"
  >
    <MenuItem value="">Unassigned</MenuItem>
    {assignableUsers.map(user => (
      <MenuItem key={user.uid} value={user.uid}>
        {user.name || user.email} ({user.role})
      </MenuItem>
    ))}
  </Select>
</FormControl>
                                <FormControl fullWidth sx={{mb: 2}}>
                                    <InputLabel>Priority</InputLabel>
                                    <Select
                                        name="priority"
                                        value={values.priority}
                                        onChange={handleChange}
                                        required
                                        label="Priority"
                                    >
                                        <MenuItem value="Low">Low</MenuItem>
                                        <MenuItem value="Medium">Medium</MenuItem>
                                        <MenuItem value="High">High</MenuItem>
                                        <MenuItem value="Critical">Critical</MenuItem>
                                    </Select>
                                </FormControl>
                                <Box sx={{mb: 2}}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                    {preview && (
                                        <Box
                                            component="img"
                                            src={preview}
                                            alt="Preview"
                                            sx={{width: '100%', mt: 2, borderRadius: 2}}
                                        />
                                    )}
                                </Box>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    fullWidth
                                    disabled={loading}
                                    sx={{py: 1.5}}
                                >
                                    {loading ? <CircularProgress size={24}/> : 'Submit Request'}
                                </Button>
                            </Box>
                        </Paper>
                    </Container>
                    <Snackbar
                        open={!!snack}
                        autoHideDuration={4000}
                        onClose={() => setSnack('')}
                        message={snack}
                    />
                </Box>
            </Box>
        </Box>
    );
}