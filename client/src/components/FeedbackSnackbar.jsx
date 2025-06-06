import React from 'react';
import { Snackbar, Alert } from '@mui/material';

export default function FeedbackSnackbar({ open, onClose, severity, message, icon }) {
    return (
        <Snackbar
            open={open}
            autoHideDuration={4000}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert
                severity={severity}
                variant="filled"
                icon={icon}
                onClose={onClose}
                sx={{ width: '100%' }}
            >
                {message}
            </Alert>
        </Snackbar>
    );
}
