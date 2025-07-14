import React, { useState, useEffect } from 'react';
import {
    Container, Box, Button, Typography, Link, Divider, Paper,
    useTheme, CircularProgress
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { auth } from '../firebase-config';
import { useSnackbar } from '../components/FeedbackSnackbar';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import api from '../api/ApiClient';
import UniversalFormFields from '../components/UniversalFormFields';

export default function LoginPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const [user] = useAuthState(auth);

    const [form, setForm] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const loginFields = [
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'password', label: 'Password', type: 'password', required: true }
    ];

    useEffect(() => {
        if (user) navigate('/dashboard');
    }, [user, navigate]);

    const validateFields = () => {
        let valid = true;
        const newErrors = {};
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

    const postLoginRedirect = async (uid) => {
        try {
            const res = await api.get(`/users/${uid}/permissions`);
            const role = res.data.role;
            navigate(role === 'operator' ? '/requests' : '/dashboard');
        } catch (err) {
            console.error('Permissions fetch failed:', err);
            navigate('/dashboard');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!validateFields()) return;
        setLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
            showSnackbar('Login successful!', 'success', { icon: <CheckCircleIcon /> });
            await postLoginRedirect(userCredential.user.uid);
        } catch (err) {
            console.error('Login error:', err);
            showSnackbar(`Error: ${err.message}`, 'error', { icon: <ErrorIcon /> });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, new GoogleAuthProvider());
            showSnackbar('Signed in with Google', 'success', { icon: <CheckCircleIcon /> });
            await postLoginRedirect(result.user.uid);
        } catch (err) {
            console.error('Google login error:', err);
            showSnackbar(`Error: ${err.message}`, 'error', { icon: <ErrorIcon /> });
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
                        <img src="/logo.svg" alt="FixMate" style={{ width: 36, height: 36, marginRight: 8 }} />
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
                        <Typography variant="h5" fontWeight="bold" sx={{ maxWidth: 220 }}>
                            Empowering Uptime.<br />Simplifying Maintenance.
                        </Typography>
                        <Box component="img" src="/avatar.png" alt="Worker" sx={{
                            width: { xs: '100%', sm: 150, md: 200 },
                            maxHeight: 240,
                            objectFit: 'contain'
                        }} />
                    </Box>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
                <Box sx={{
                    flex: 1,
                    p: 4,
                    backgroundColor: theme.palette.mode === 'dark'
                        ? theme.palette.grey[900]
                        : theme.palette.background.default
                }}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>Sign In</Typography>
                    <Box component="form" onSubmit={handleLogin}>
                        <UniversalFormFields
                            fields={loginFields}
                            form={form}
                            errors={errors}
                            onChange={(name, value) => {
                                setForm({ ...form, [name]: value });
                                setErrors({ ...errors, [name]: '' });
                            }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{ mt: 2 }}
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
                            <Link href="/signup" underline="hover">Don't have an account?</Link>
                            <Link href="/reset-password" underline="hover">Forgot password?</Link>
                        </Box>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
}
