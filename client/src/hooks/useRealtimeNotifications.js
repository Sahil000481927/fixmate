import { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, off, get } from 'firebase/database';
import { getAuth } from 'firebase/auth';

/**
 * useRealtimeNotifications - React hook for real-time notifications and badge count
 * Returns: { notifications, unreadCount, loading }
 */
export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async user => {
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      let role = undefined;
      // Try to get custom claims for role if available
      if (user.getIdTokenResult) {
        try {
          const token = await user.getIdTokenResult();
          role = token.claims.role;
        } catch (e) {
          role = undefined;
        }
      }
      // Fallback: try to get role from user object (if you attach it at login)
      if (!role && user && user.reloadUserInfo && user.reloadUserInfo.customAttributes) {
        try {
          const attrs = JSON.parse(user.reloadUserInfo.customAttributes);
          role = attrs.role;
        } catch {}
      }
      // FINAL fallback: fetch from /users/<uid> in RTDB
      if (!role) {
        try {
          const db = getDatabase();
          const userSnap = await get(ref(db, `/users/${user.uid}`));
          if (userSnap.exists()) {
            role = userSnap.val().role;
          }
        } catch {}
      }
      if (!role) {
        console.warn('No role found for user', user.uid, 'Notifications may not filter correctly.');
      }
      const db = getDatabase();
      const notifRef = ref(db, '/notifications');
      const handleValue = (snap) => {
        const all = snap.val() || {};
        let list = Object.entries(all)
          .map(([id, n]) => ({ id, ...n }))
          .filter(n => !n.deleted);
        console.log('All notifications from DB:', list);
        if (role === 'admin' || role === 'lead') {
          // Admin/lead: see all
        } else if (role === 'technician') {
          // Technician: their own or assignedTo
          list = list.filter(n => n.userId === user.uid || n.assignedTo === user.uid);
        } else {
          // Operator or unknown: only their own
          list = list.filter(n => n.userId === user.uid);
        }
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setNotifications(list);
        setUnreadCount(list.filter(n => !n.read).length);
        setLoading(false);
        // Debug: log to verify hook is running
        console.log('Realtime notifications updated:', list, 'Role:', role, 'User:', user.uid);
      };
      onValue(notifRef, handleValue);
      return () => off(notifRef, 'value', handleValue);
    });
    return () => unsubscribe();
  }, []);

  return { notifications, unreadCount, loading };
}
