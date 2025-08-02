import React, { useState, useEffect } from 'react';
import {
    Container, Box, Button, Typography, Link, Divider, Paper,
    useTheme, CircularProgress
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile
} from 'firebase/auth';
import { auth } from '../firebase-config';
import { useSnackbar } from '../components/FeedbackSnackbar';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import api from '../api/ApiClient';
import UniversalFormFields from '../components/UniversalFormFields';

export default function SignupPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const [user] = useAuthState(auth);

    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const signupFields = [
        { name: 'name', label: 'Full Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'password', label: 'Password', type: 'password', required: true }
    ];

    useEffect(() => {
        if (user) navigate('/dashboard');
    }, [user, navigate]);

    const validateFields = () => {
        let valid = true;
        const newErrors = {};
        if (form.name.trim().length < 2) {
            newErrors.name = 'Enter your full name';
            valid = false;
        }
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

    const postSignupSetup = async () => {
        try {
            // Create user profile and wait for permissions to be set
            await api.post('/users/profile', { name: form.name });

            // Wait a bit for permissions to propagate and then verify they exist
            let retries = 0;
            const maxRetries = 10;

            while (retries < maxRetries) {
                try {
                    const permRes = await api.get(`/users/${auth.currentUser.uid}/permissions`);
                    if (permRes.data && Object.keys(permRes.data).length > 0) {
                        // Permissions are properly set
                        break;
                    }
                } catch (permErr) {
                    console.log('Waiting for permissions to be set...');
                }

                // Wait 500ms before retrying
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }

            if (retries >= maxRetries) {
                throw new Error('Permissions setup timeout - please refresh the page');
            }

        } catch (err) {
            console.error('Backend user setup failed:', err);
            throw err;
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        if (!validateFields()) return;
        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
            await updateProfile(userCredential.user, { displayName: form.name });
            await postSignupSetup();

            showSnackbar('Signup successful! Redirecting...', 'success', { icon: <CheckCircleIcon /> });
            navigate('/dashboard');
        } catch (err) {
            console.error('Signup error:', err);
            showSnackbar(`Error: ${err.message}`, 'error', { icon: <ErrorIcon /> });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, new GoogleAuthProvider());
            await postSignupSetup();

            showSnackbar('Signed up with Google', 'success', { icon: <CheckCircleIcon /> });
            navigate('/dashboard');
        } catch (err) {
            console.error('Google signup error:', err);
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
                            Your maintenance journey starts here.
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
                    <Typography variant="h4" fontWeight="bold" gutterBottom>Create Account</Typography>
                    <Box component="form" onSubmit={handleSignup}>
                        <UniversalFormFields
                            fields={signupFields}
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
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign Up'}
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<GoogleIcon />}
                            onClick={handleGoogleSignup}
                            disabled={loading}
                            sx={{ mt: 2 }}
                        >
                            Sign up with Google
                        </Button>
                        <Box sx={{ mt: 2 }}>
                            <Link href="/login" underline="hover">Already have an account?</Link>
                        </Box>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
}
