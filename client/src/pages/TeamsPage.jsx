import React, { useEffect, useState } from 'react';
import {
    Box,
    CircularProgress,
    Paper,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Button,
    Collapse,
    List,
    ListItem,
    Divider,
} from '@mui/material';
import AppLayout from '../components/AppLayout';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase-config';

export default function TeamsPage() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [expandedUserId, setExpandedUserId] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userSnap, requestSnap] = await Promise.all([
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'requests')),
                ]);

                const usersData = userSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                const requestsData = requestSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                setUsers(usersData);
                setRequests(requestsData);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getUserPendingRequests = (userId) => {
        return requests.filter(
            (req) => req.status === 'Pending' && req.createdBy === userId
        );
    };

    const toggleExpand = (userId) => {
        setExpandedUserId(prev => (prev === userId ? null : userId));
    };

    return (
        <AppLayout activeItem="Teams">
            <Box sx={{ mt: 4, px: { xs: 2, sm: 4, md: 6 }, width: '100%' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                    Team Members
                </Typography>

                {loading ? (
                    <Box sx={{ textAlign: 'center', mt: 10 }}>
                        <CircularProgress />
                    </Box>
                ) : users.length === 0 ? (
                    <Typography>No team members found.</Typography>
                ) : (
                    <Paper elevation={3} sx={{ borderRadius: 3, p: 2, overflowX: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Name</strong></TableCell>
                                    <TableCell><strong>Role</strong></TableCell>
                                    <TableCell><strong>Email</strong></TableCell>
                                    <TableCell align="center"><strong>Pending Tasks</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map((user) => {
                                    const pendingRequests = getUserPendingRequests(user.id);
                                    return (
                                        <React.Fragment key={user.id}>
                                            <TableRow>
                                                <TableCell>{user.name || '-'}</TableCell>
                                                <TableCell>{user.role || '-'}</TableCell>
                                                <TableCell>{user.email || '-'}</TableCell>
                                                <TableCell align="center">
                                                    {pendingRequests.length > 0 ? (
                                                        <Button
                                                            size="small"
                                                            onClick={() => toggleExpand(user.id)}
                                                        >
                                                            {pendingRequests.length}
                                                        </Button>
                                                    ) : (
                                                        <Typography color="text.secondary">0</Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell colSpan={4} sx={{ p: 0, border: 0 }}>
                                                    <Collapse in={expandedUserId === user.id} timeout="auto" unmountOnExit>
                                                        <Box sx={{ p: 2 }}>
                                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                                                Pending Tasks for {user.name || user.email}:
                                                            </Typography>
                                                            <List dense>
                                                                {pendingRequests.map((task) => (
                                                                    <React.Fragment key={task.id}>
                                                                        <ListItem>
                                                                            <Box>
                                                                                <Typography variant="body1" fontWeight={500}>
                                                                                    {task.title || `Request #${task.id.slice(-5)}`}
                                                                                </Typography>
                                                                                <Typography variant="body2" color="text.secondary">
                                                                                    Machine: {task.machineId} • Priority: {task.priority}
                                                                                </Typography>
                                                                            </Box>
                                                                        </ListItem>
                                                                        <Divider />
                                                                    </React.Fragment>
                                                                ))}
                                                            </List>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Paper>
                )}
            </Box>
        </AppLayout>
    );
}
