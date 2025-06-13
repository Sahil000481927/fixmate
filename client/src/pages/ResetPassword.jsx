import React, { useState, useEffect } from 'react';
import {
    Container, Box, TextField, Button, Typography, Divider, Paper,
    useTheme, CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase-config';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
    const theme = useTheme();
    const navigate = useNavigate();
    const [user] = useAuthState(auth);

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success', icon: null });

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const showSnackbar = (message, severity, icon) => {
        setSnackbar({ open: true, message, severity, icon });
    };

    const validateEmail = () => {
        if (!email.includes('@')) {
            setError('Enter a valid email address');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateEmail()) return;

        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            showSnackbar('Password reset link sent to your email.', 'success', <CheckCircleIcon />);
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
                {/* Left section */}
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

                    {/* Slogan + Avatar block */}
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 3,
                        }}
                    >
                        <Typography
                            variant="h5"
                            fontWeight="bold"
                            sx={{
                                color: theme.palette.mode === 'dark' ? 'grey.300' : 'text.primary',
                                maxWidth: 220,
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
                                objectFit: 'contain',
                            }}
                        />
                    </Box>
                </Box>

                {/* Divider */}
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, bgcolor: 'divider' }} />

                {/* Right section - Form */}
                <Box sx={{
                    flex: 1,
                    p: 4,
                    backgroundColor: theme.palette.mode === 'dark'
                        ? theme.palette.grey[900] // or a custom color like '#23272f'
                        : theme.palette.background.default
                }}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>Reset Password</Typography>
                    <Typography variant="body2" sx={{ mb: 3 }}>
                        Enter your email to receive a reset link.
                    </Typography>
                    <Box component="form" onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            required
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setError('');
                            }}
                            error={!!error}
                            helperText={error || ' '}
                            margin="normal"
                            color="primary"
                            focused
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            startIcon={<SendIcon />}
                            sx={{ mt: 2, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
                        >
                            {loading ? <CircularProgress size={22} color="inherit" /> : 'Send Reset Link'}
                        </Button>
                        <Button
                            href="/login"
                            fullWidth
                            variant="outlined"
                            sx={{ mt: 2 }}
                        >
                            Back to Login
                        </Button>
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
