import React from 'react';
import {Typography, Container, Button} from '@mui/material';
import {auth} from '../firebase-config';
import {useNavigate} from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/login');
    };

    return (
        <Container sx={{mt: 10}}>
            <Typography variant="h4" gutterBottom>Welcome to FixMate Dashboard</Typography>
            <Typography variant="body1" sx={{mb: 4}}>
                You're logged in. Future features will appear here.
            </Typography>
            <Button variant="outlined" onClick={handleLogout}>Log out</Button>
        </Container>
    );
}
