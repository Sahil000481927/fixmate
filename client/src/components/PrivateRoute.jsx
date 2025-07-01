import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';

export default function PrivateRoute({ children, requiredRole }) {
    const [user, loading] = useAuthState(auth);
    const [userRole, setUserRole] = useState(null);
    const [roleLoading, setRoleLoading] = useState(true);

    useEffect(() => {
        const fetchUserRole = async () => {
            if (user) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserRole(userDoc.data().role);
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