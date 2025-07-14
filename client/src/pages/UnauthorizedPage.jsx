import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import AppLayout from '../components/AppLayout';
import LockIcon from '@mui/icons-material/Lock';

export default function UnauthorizedPage() {
    return (
        <AppLayout activeItem="Unauthorized" title="Access Denied">
            <Box
                sx={{
                    textAlign: 'center',
                    mt: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <LockIcon sx={{ fontSize: 80, color: 'error.main' }} />
                <Typography variant="h4" gutterBottom>Unauthorized</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                    You do not have permission to view this page or perform this action.
                </Typography>
                <Button variant="contained" onClick={() => window.history.back()}>
                    Go Back
                </Button>
            </Box>
        </AppLayout>
    );
}
