import { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { getAuth } from 'firebase/auth';

/**
 * useRealtimeHistory - React hook for real-time history log
 * Returns: { history, loading }
 */
export function useRealtimeHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (!user) {
        setHistory([]);
        setLoading(false);
        return;
      }
      const db = getDatabase();
      const histRef = ref(db, '/history');
      const handleValue = (snap) => {
        let all = snap.val() || {};
        let list = Object.entries(all).map(([id, h]) => ({ id, ...h }));
        // Filter for non-admin/lead: only their own or involved
        if (user.role !== 'admin' && user.role !== 'lead') {
          list = list.filter(h =>
            h.userId === user.uid ||
            (h.relatedResource && Array.isArray(h.relatedResource.participants) && h.relatedResource.participants.includes(user.uid))
          );
        }
        list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setHistory(list);
        setLoading(false);
      };
      onValue(histRef, handleValue);
      return () => off(histRef, 'value', handleValue);
    });
    return () => unsubscribe();
  }, []);

  return { history, loading };
}

