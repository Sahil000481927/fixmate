import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import AppLayout from '../components/AppLayout';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <AppLayout activeItem="Not Found" title="Page Not Found">
            <Box
                sx={{
                    textAlign: 'center',
                    mt: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <ReportProblemOutlinedIcon sx={{ fontSize: 80, color: 'warning.main' }} />
                <Typography variant="h4" gutterBottom>404 - Page Not Found</Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                    Sorry, we couldn't find the page you're looking for. It may have been moved or deleted.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" color="primary" onClick={() => navigate('/')}>
                        Go Home
                    </Button>
                    <Button variant="outlined" onClick={() => navigate(-1)}>
                        Go Back
                    </Button>
                </Box>
            </Box>
        </AppLayout>
    );
}
