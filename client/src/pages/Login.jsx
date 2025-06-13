import React, { useState, useEffect } from 'react';
import {
    Container, Box, TextField, Button, Typography, Link, Divider, Paper,
    useTheme, CircularProgress
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase-config';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function Login() {
    const theme = useTheme();
    const navigate = useNavigate();
    const [user] = useAuthState(auth);

    const [form, setForm] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({ email: '', password: '' });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success', icon: null });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) navigate('/dashboard');
    }, [user, navigate]);

    const validateFields = () => {
        let valid = true;
        const newErrors = { email: '', password: '' };

        if (!form.email.includes('@')) {
            newErrors.email = 'Enter a valid email address';
            valid = false;
        }

        if (form.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleInputChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setErrors({ ...errors, [e.target.name]: '' });
    };

    const showSnackbar = (message, severity, icon) => {
        setSnackbar({ open: true, message, severity, icon });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!validateFields()) return;

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, form.email, form.password);
            showSnackbar('Login successful!', 'success', <CheckCircleIcon />);
            navigate('/dashboard');
        } catch (err) {
            showSnackbar(`Error: ${err.message}`, 'error', <ErrorIcon />);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await signInWithPopup(auth, new GoogleAuthProvider());
            showSnackbar('Signed in with Google', 'success', <CheckCircleIcon />);
            navigate('/dashboard');
        } catch (err) {
            showSnackbar(`Error: ${err.message}`, 'error', <ErrorIcon />);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 6 }}>
            <Paper elevation={3} sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                borderRadius: 3,
                overflow: 'hidden',
                minHeight: { md: 500 },
                backgroundColor: theme.palette.background.paper
            }}>
                {/* Left Section */}
                <Box sx={{
                    flex: 1,
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#f9fafb',
                    minHeight: '100%',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
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

                    <Box sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 3
                    }}>
                        <Typography
                            variant="h5"
                            fontWeight="bold"
                            sx={{
                                color: theme.palette.mode === 'dark' ? 'grey.300' : 'text.primary',
                                maxWidth: 220
                            }}
                        >
                            Empowering Uptime.<br />Simplifying Maintenance.
                        </Typography>

                        <Box
                            component="img"
                            src="/avatar.png"
                            alt="Worker"
                            sx={{
                                width: { xs: '100%', sm: 150, md: 200 },
                                maxHeight: 240,
                                objectFit: 'contain'
                            }}
                        />
                    </Box>
                </Box>

                {/* Divider */}
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, bgcolor: 'divider' }} />

                {/* Right Section - Form */}
                <Box sx={{
                    flex: 1,
                    p: 4,
                    backgroundColor: theme.palette.mode === 'dark'
                        ? theme.palette.grey[900] // or a custom color like '#23272f'
                        : theme.palette.background.default
                }}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>Sign In</Typography>
                    <Box component="form" onSubmit={handleLogin}>
                        <TextField
                            required
                            fullWidth
                            label="Email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleInputChange}
                            error={!!errors.email}
                            helperText={errors.email || ' '}
                            margin="normal"
                            color="primary"
                            focused
                        />
                        <TextField
                            required
                            fullWidth
                            label="Password"
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleInputChange}
                            error={!!errors.password}
                            helperText={errors.password || ' '}
                            margin="normal"
                            color="primary"
                            focused
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{ mt: 2, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<GoogleIcon />}
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            sx={{ mt: 2 }}
                        >
                            Sign in with Google
                        </Button>
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                            <Link href="/signup" underline="hover" sx={{ fontWeight: 500 }}>Don't have an account?</Link>
                            <Link href="/reset-password" underline="hover" sx={{ fontWeight: 500 }}>Forgot password?</Link>
                        </Box>
                    </Box>
                </Box>
            </Paper>

            <FeedbackSnackbar
                open={snackbar.open}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                severity={snackbar.severity}
                icon={snackbar.icon}
                message={snackbar.message}
            />
        </Container>
    );
}
