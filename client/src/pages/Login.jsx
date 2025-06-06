import React, {useState, useEffect} from 'react';
import {
    Container, Box, TextField, Button, Typography, Link, Divider, Paper, useTheme
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import {signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup} from 'firebase/auth';
import {auth} from '../firebase-config';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import {useNavigate} from "react-router-dom";
import {useAuthState} from 'react-firebase-hooks/auth';

export default function Login() {
    const theme = useTheme();
    const navigate = useNavigate();
    const [user] = useAuthState(auth);

    const [form, setForm] = useState({email: '', password: ''});
    const [snackbar, setSnackbar] = useState({open: false, message: '', severity: 'success', icon: null});

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleInputChange = (e) => {
        setForm({...form, [e.target.name]: e.target.value});
    };

    const showSnackbar = (message, severity, icon) => {
        setSnackbar({open: true, message, severity, icon});
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, form.email, form.password);
            showSnackbar('Login successful!', 'success', <CheckCircleIcon/>);
            navigate('/dashboard');
        } catch (err) {
            showSnackbar(`Error: ${err.message}`, 'error', <ErrorIcon/>);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, new GoogleAuthProvider());
            showSnackbar('Signed in with Google', 'success', <CheckCircleIcon/>);
            navigate('/dashboard');
        } catch (err) {
            showSnackbar(`Error: ${err.message}`, 'error', <ErrorIcon/>);
        }
    };

    return (
        <Container maxWidth="md" sx={{py: 6}}>
            <Paper elevation={3} sx={{
                display: 'flex',
                flexDirection: {xs: 'column', md: 'row'},
                borderRadius: 3,
                overflow: 'hidden',
                minHeight: {md: 500}
            }}>
                {/* Left side */}
                <Box
                    sx={{
                        flex: 1,
                        p: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#f9fafb',
                        minHeight: '100%',
                    }}
                >
                    {/* Logo */}
                    <Box sx={{display: 'flex', alignItems: 'center', mb: 3}}>
                        <img
                            src="/logo.svg"
                            alt="FixMate"
                            style={{
                                width: 36,
                                height: 36,
                                marginRight: 8,
                                filter: theme.palette.mode === 'dark' ? 'invert(1)' : 'none'
                            }}
                        />
                        <Typography variant="h6" fontWeight="bold">FixMate</Typography>
                    </Box>

                    {/* Slogan + Avatar block */}
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: {xs: 'column', md: 'row'},
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 3,
                        }}
                    >
                        {/* Slogan */}
                        <Typography
                            variant="h5"
                            fontWeight="bold"
                            sx={{
                                color: theme.palette.mode === 'dark' ? 'grey.300' : 'text.primary',
                                maxWidth: 220,
                            }}
                        >
                            Empowering Uptime.<br/>Simplifying Maintenance.
                        </Typography>

                        {/* Avatar */}
                        <Box
                            component="img"
                            src="/avatar.svg"
                            alt="Worker"
                            sx={{
                                width: {xs: '100%', sm: 150, md: 200},
                                maxHeight: 240,
                                objectFit: 'contain',
                            }}
                        />
                    </Box>
                </Box>


                {/* Divider */}
                <Divider orientation="vertical" flexItem sx={{display: {xs: 'none', md: 'block'}, bgcolor: 'divider'}}/>

                {/* Right side - Form */}
                <Box sx={{flex: 1, p: 4, backgroundColor: theme.palette.background.default}}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>Sign In</Typography>
                    <Box component="form" onSubmit={handleLogin}>
                        <TextField
                            fullWidth
                            label="Email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleInputChange}
                            margin="normal"
                            color="primary"
                            focused
                        />
                        <TextField
                            fullWidth
                            label="Password"
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleInputChange}
                            margin="normal"
                            color="primary"
                            focused
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{mt: 2, bgcolor: 'primary.main', color: 'white', '&:hover': {bgcolor: 'primary.dark'}}}
                        >
                            Sign In
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<GoogleIcon/>}
                            onClick={handleGoogleLogin}
                            sx={{mt: 2}}
                        >
                            Sign in with Google
                        </Button>
                        <Box sx={{mt: 2, display: 'flex', justifyContent: 'space-between'}}>
                            <Link href="/signup" underline="hover" sx={{fontWeight: 500}}>Don't have an account?</Link>
                            <Link href="/reset-password" underline="hover" sx={{fontWeight: 500}}>Forgot
                                password?</Link>
                        </Box>
                    </Box>
                </Box>
            </Paper>

            {/* Snackbar */}
            <FeedbackSnackbar
                open={snackbar.open}
                onClose={() => setSnackbar({...snackbar, open: false})}
                severity={snackbar.severity}
                icon={snackbar.icon}
                message={snackbar.message}
            />
        </Container>
    );
}
