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
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        const fetchPermissions = async () => {
            try {
                if (!permission) {
                    setError('No permission specified for PrivateRoute');
                    setHasPermission(false);
                    return;
                }

                if (!user?.uid) {
                    setHasPermission(false);
                    return;
                }

                const res = await api.get(`/users/${user.uid}/permissions`);
                const permissionValue = res.data?.[`can_${permission}`];
                setHasPermission(Boolean(permissionValue));
                setError(null);
            } catch (err) {
                setError(`Error fetching permissions: ${err?.message || 'Unknown error'}`);
                setHasPermission(false);
            }
        };
        
        if (user && permission) {
            fetchPermissions();
        } else if (user && !permission) {
            setError('PrivateRoute called without permission prop');
            setHasPermission(false);
        } else if (!user) {
            setHasPermission(null);
            setError(null);
        }
    }, [user, permission]);

    // Log errors outside of render
    React.useEffect(() => {
        if (error) {
            console.error('PrivateRoute error:', error);
        }
    }, [error]);

    if (loading || (user && hasPermission === null)) {
        return (
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                minHeight: '100vh', 
                width: '100vw', 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                zIndex: 2000, 
                background: 'rgba(255,255,255,0.7)' 
            }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (hasPermission === false) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}
