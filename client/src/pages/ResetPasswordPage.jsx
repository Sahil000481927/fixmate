import React, { useState, useEffect } from 'react';
import {
    Container, Box, Button, Typography, Divider, Paper,
    useTheme, CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase-config';
import { useSnackbar } from '../components/FeedbackSnackbar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import UniversalFormFields from '../components/UniversalFormFields';

export default function ResetPasswordPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const [user] = useAuthState(auth);

    const [form, setForm] = useState({ email: '' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const resetFields = [
        { name: 'email', label: 'Email', type: 'email', required: true }
    ];

    useEffect(() => {
        if (user) navigate('/dashboard');
    }, [user, navigate]);

    const validateEmail = () => {
        if (!form.email.includes('@')) {
            setErrors({ email: 'Enter a valid email address' });
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateEmail()) return;

        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, form.email);
            showSnackbar('Password reset link sent to your email.', 'success', { icon: <CheckCircleIcon /> });
        } catch (err) {
            console.error('Reset password error:', err);
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
                {/* Left section */}
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
                            Reset your password and regain access.
                        </Typography>
                        <Box component="img" src="/avatar.png" alt="Worker" sx={{
                            width: { xs: '100%', sm: 150, md: 200 },
                            maxHeight: 240,
                            objectFit: 'contain'
                        }} />
                    </Box>
                </Box>

                {/* Divider */}
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

                {/* Right section */}
                <Box sx={{
                    flex: 1,
                    p: 4,
                    backgroundColor: theme.palette.mode === 'dark'
                        ? theme.palette.grey[900]
                        : theme.palette.background.default
                }}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>Reset Password</Typography>
                    <Typography variant="body2" sx={{ mb: 3 }}>
                        Enter your email address and we'll send you a link to reset your password.
                    </Typography>
                    <Box component="form" onSubmit={handleSubmit}>
                        <UniversalFormFields
                            fields={resetFields}
                            form={form}
                            errors={errors}
                            onChange={(name, value) => {
                                setForm({ ...form, [name]: value });
                                setErrors({});
                            }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            startIcon={<SendIcon />}
                            sx={{ mt: 2 }}
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
        </Container>
    );
}
