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
import { db } from '../firebase-config';
import { getDocs, collection } from 'firebase/firestore';
import rolePermissions from '../config/rolePermissions';


const drawerWidth = 240;

export default function NewRequestForm() {
    const theme = useTheme();
    const [user] = useAuthState(auth);
    const [values, setValues] = useState({
        title: '',
        description: '',
        machineId: '',
        priority: '',
        assignedTo: '', 
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

   
    const currentUserId = user?.uid;

    const [employees, setEmployees] = useState([]);
  
useEffect(() => {
    if (!user) return; 
    const fetchEmployees = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      setEmployees(
        users.filter(user =>
          user.permissions?.can_update_status === true && user.id !== currentUserId
        )
      );
    };
    fetchEmployees();
  }, [user, currentUserId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        const formData = new FormData();
        formData.append('title', values.title);
        formData.append('description', values.description);
        formData.append('machineId', values.machineId);
        formData.append('priority', values.priority);
        if (file) formData.append('photo', file);
        formData.append('createdBy', user.uid);
        formData.append('assignedTo', values.assignedTo);


        try {
            const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
            setLoading(true);
            await axios.post(`${API}/api/requests`, formData);
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
                                <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Assign to</InputLabel>
                                <Select
                                    name="assignedTo"
                                    value={values.assignedTo}
                                    onChange={handleChange}
                                    required
                                    label="Assign to"
                                >
                                    {employees.map((emp) => (
                                        <MenuItem key={emp.id} value={emp.id}>
                                            {emp.name || emp.email}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                                <FormControl fullWidth sx={{mb: 2}}>
                                    <InputLabel>Machine</InputLabel>
                                    <Select
                                        name="machineId"
                                        value={values.machineId}
                                        onChange={handleChange}
                                        required
                                        label="Machine"
                                    >
                                        <MenuItem value="MCH-001">MCH-001</MenuItem>
                                        <MenuItem value="MCH-002">MCH-002</MenuItem>
                                        <MenuItem value="MCH-003">MCH-003</MenuItem>
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