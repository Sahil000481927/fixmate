import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import CircularProgress from '@mui/material/CircularProgress';
import api from '../api/ApiClient';
import Box from '@mui/material/Box';

export default function PrivateRoute({ children, permission }) {
    const [user, loading] = useAuthState(auth);
    const [hasPermission, setHasPermission] = React.useState(null);

    React.useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const res = await api.get(`/users/${user.uid}/permissions`);
                setHasPermission(res.data[`can_${permission}`]);
            } catch {
                setHasPermission(false);
            }
        };
        if (user) fetchPermissions();
    }, [user, permission]);

    if (loading || hasPermission === null) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 2000, background: 'rgba(255,255,255,0.7)' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!user || !hasPermission) {
        return <Navigate to="/unauthorized" />;
    }

    return children;
}
