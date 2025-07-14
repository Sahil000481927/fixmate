import React from 'react';
import {
    Box, Typography, CircularProgress, useMediaQuery, Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AppLayout from '../components/AppLayout';
import { useSnackbar } from '../components/FeedbackSnackbar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import { useRealtimeHistory } from '../hooks/useRealtimeHistory';
import Table from '../components/Table';
import Card from '../components/Card';

export default function HistoryPage() {
    const { showSnackbar } = useSnackbar();
    const [user] = useAuthState(auth);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const { history, loading } = useRealtimeHistory();

    const tableColumns = ['User', 'Action', 'Details', 'Timestamp'];
    const tableRows = history.map(h => ({
        User: h.userName,
        Action: <Chip size="small" label={h.action} color="info" />,
        Details: h.details || '-',
        Timestamp: new Date(h.timestamp).toLocaleString()
    }));

    return (
        <AppLayout activeItem="History" title="History">
            {loading ? (
                <Box textAlign="center" mt={10}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {!isMobile ? (
                        <Table
                            columns={tableColumns}
                            rows={tableRows}
                            emptyMessage="No history records found."
                        />
                    ) : (
                        history.map(h => (
                            <Card
                                key={h.id}
                                title={h.action}
                                subtitle={`By: ${h.userName}`}
                                content={
                                    <>
                                        <Typography variant="body2">Details: {h.details || 'N/A'}</Typography>
                                        <Typography variant="body2">At: {new Date(h.timestamp).toLocaleString()}</Typography>
                                    </>
                                }
                            />
                        ))
                    )}
                </>
            )}
        </AppLayout>
    );
}
