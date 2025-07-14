import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, rtdb } from '../firebase-config';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Chip, Typography, Box, CircularProgress } from '@mui/material';
import { ref, get, set, update, push } from 'firebase/database';

const DEFAULT_MACHINE_TYPES = ['Lathe', 'Milling Machine', 'Drill Press', 'Grinder', 'CNC Machine'];

export default function MachineTypeInterrupter() {
    const [user] = useAuthState(auth);
    const [open, setOpen] = useState(false);
    const [missingTypes, setMissingTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [allTypes, setAllTypes] = useState([]);
    const isAdmin = user?.email?.includes('admin'); // Replace with real admin check or permission

    const fetchTypes = async () => {
        if (!isAdmin) return;
        setLoading(true);
        setError("");
        try {
            const typesRef = ref(rtdb, 'machineTypes');
            const snapshot = await get(typesRef);
            let types = [];
            if (snapshot.exists()) {
                types = Object.values(snapshot.val() || {});
            }
            setAllTypes(types);
            const missing = DEFAULT_MACHINE_TYPES.filter(type => !types.includes(type));
            setMissingTypes(missing);
            setOpen(missing.length > 0);
        } catch (err) {
            setError("Failed to fetch machine types. You can try to repopulate the defaults.");
            setMissingTypes(DEFAULT_MACHINE_TYPES); // Assume all are missing for repopulation
            setOpen(true);
        }
        setLoading(false);
    };

    useEffect(() => { fetchTypes(); }, [user]);

    // Repopulate: remove all existing defaults, keep custom, then add all defaults afresh
    const handleRepopulate = async () => {
        setLoading(true);
        setError("");
        try {
            const typesRef = ref(rtdb, 'machineTypes');
            const snapshot = await get(typesRef);
            let allTypeEntries = snapshot.exists() ? snapshot.val() || {} : {};
            // Separate keys for defaults and custom
            let defaultKeys = Object.entries(allTypeEntries)
                .filter(([_, type]) => DEFAULT_MACHINE_TYPES.includes(type))
                .map(([key]) => key);
            let customEntries = Object.entries(allTypeEntries)
                .filter(([_, type]) => !DEFAULT_MACHINE_TYPES.includes(type));
            // Remove all default types
            for (let key of defaultKeys) {
                await set(ref(rtdb, `machineTypes/${key}`), null);
            }
            // Add all defaults afresh
            let updates = {};
            DEFAULT_MACHINE_TYPES.forEach(type => {
                const newKey = push(typesRef).key;
                updates[newKey] = type;
            });
            if (Object.keys(updates).length > 0) {
                await update(typesRef, updates);
            }
            await fetchTypes();
        } catch (err) {
            setError("Failed to repopulate machine types.");
        }
        setLoading(false);
    };

    if (!isAdmin) return null;
    return (
        <Dialog open={open} disableEscapeKeyDown disableBackdropClick>
            <DialogTitle>Default Machine Types Missing</DialogTitle>
            <DialogContent>
                {error && (
                    <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
                )}
                <Typography sx={{ mb: 2 }}>
                    Some default machine types are missing. Click below to repopulate all defaults. This will add any missing default types, but will not remove or overwrite any custom types that have been added.
                </Typography>
                <Box sx={{ mt: 2, mb: 2 }}>
                    {missingTypes.length === 0 ? (
                        <Typography color="success.main">All default machine types are present.</Typography>
                    ) : (
                        <>
                            <Typography sx={{ mb: 1 }}>Missing types:</Typography>
                            {missingTypes.map((type) => (
                                <Chip key={type} label={type} sx={{ mr: 1, mb: 1 }} />
                            ))}
                        </>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                {missingTypes.length > 0 && (
                    <Button onClick={handleRepopulate} variant="contained" color="primary" disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : 'Repopulate Defaults'}
                    </Button>
                )}
                <Button onClick={() => setOpen(false)} disabled={loading} variant="outlined">Done</Button>
            </DialogActions>
        </Dialog>
    );
}
