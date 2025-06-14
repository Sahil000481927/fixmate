import React, {useState} from 'react';
import {
    Typography,
    TextField,
    Button,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    Box,
    CircularProgress,
    Snackbar,
    Toolbar,
    Paper,
    Container,
    AppBar,
    IconButton,
    useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import {useTheme} from '@mui/material/styles';
import {useAuthState} from 'react-firebase-hooks/auth';
import {auth} from '../firebase-config';
import axios from 'axios';
import Sidebar from '../components/Sidebar.jsx';

const drawerWidth = 240;

export default function NewRequestForm() {
    const theme = useTheme();
    const [user] = useAuthState(auth);
    const [values, setValues] = useState({
        title: '',
        description: '',
        machineId: '',
        priority: '',
    });
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [snack, setSnack] = useState('');
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [sidebarOpen, setSidebarOpen] = useState(false);

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

        try {
            setLoading(true);
            await axios.post('http://localhost:5000/api/requests', formData);
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
            <Sidebar
                activeItem="Requests"
                open={!isMobile || sidebarOpen}
                variant={isMobile ? 'temporary' : 'permanent'}
                onClose={() => setSidebarOpen(false)}
            />
            <Box
                sx={{
                    flexGrow: 1,
                    transition: 'margin-left 0.2s',
                    marginLeft: !isMobile ? `${drawerWidth}px` : 0,
                }}
            >
                <AppBar
                    position="fixed"
                    sx={{
                        zIndex: (theme) => theme.zIndex.drawer + 1,
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        left: !isMobile ? `${drawerWidth}px` : 0,
                        width: !isMobile ? `calc(100% - ${drawerWidth}px)` : '100%',
                        transition: 'left 0.2s, width 0.2s',
                    }}
                    elevation={0}
                >
                    <Toolbar>
                        {isMobile && (
                            <IconButton
                                color="inherit"
                                edge="start"
                                onClick={() => setSidebarOpen(true)}
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