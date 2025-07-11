import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import { useEffect, useState } from 'react';
import { get, ref } from 'firebase/database';
import { rtdb } from '../firebase-config';

export default function PrivateRoute({ children, requiredRole }) {
    const [user, loading] = useAuthState(auth);
    const [userRole, setUserRole] = useState(null);
    const [roleLoading, setRoleLoading] = useState(true);

    useEffect(() => {
        const fetchUserRole = async () => {
            if (user) {
                const userRef = ref(rtdb, `users/${user.uid}`);
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    setUserRole(snapshot.val().role);
                }
                setRoleLoading(false);
            }
        };
        fetchUserRole();
    }, [user]);

    if (loading || roleLoading) return null;

    if (!user || (requiredRole && userRole !== requiredRole)) {
        return <Navigate to="/login" />;
    }

    return children;
}