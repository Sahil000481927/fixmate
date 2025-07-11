import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, rtdb } from '../firebase-config';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Chip, Typography, Box } from '@mui/material';
import { ref, get, set, update, push } from 'firebase/database';

const DEFAULT_MACHINE_TYPES = ['Lathe', 'Milling Machine', 'Drill Press', 'Grinder', 'CNC Machine'];

export default function MachineTypeInterrupter() {
    const [user] = useAuthState(auth);
    const [open, setOpen] = useState(false);
    const [missingTypes, setMissingTypes] = useState([]);
    const [newType, setNewType] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
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

    const handleAddType = async () => {
        if (!newType) return;
        setLoading(true);
        try {
            const typesRef = ref(rtdb, 'machineTypes');
            const snapshot = await get(typesRef);
            let types = snapshot.exists() ? Object.values(snapshot.val() || {}) : [];
            if (!types.includes(newType)) {
                // Add new type as a value in the node
                const newKey = push(typesRef).key;
                await update(typesRef, { [newKey]: newType });
            }
            setNewType('');
            fetchTypes();
        } catch {}
        setLoading(false);
    };
    const handleRepopulate = async () => {
        setLoading(true);
        try {
            const typesRef = ref(rtdb, 'machineTypes');
            // Remove all and repopulate
            await set(typesRef, {});
            // Add all default types
            let updates = {};
            DEFAULT_MACHINE_TYPES.forEach(type => {
                const newKey = push(typesRef).key;
                updates[newKey] = type;
            });
            await update(typesRef, updates);
            fetchTypes();
        } catch {}
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
                <Typography>Some default machine types are missing. You can add them manually or repopulate all defaults. Repopulate will remove all default types and restore the full default list, but will not touch custom types.</Typography>
                <Box sx={{ mt: 2 }}>
                    {missingTypes.map((type) => (
                        <Chip key={type} label={type} sx={{ mr: 1, mb: 1 }} />
                    ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <TextField label="Add Type" value={newType} onChange={e => setNewType(e.target.value)} fullWidth disabled={loading} />
                    <Button onClick={handleAddType} variant="contained" disabled={loading}>Add</Button>
                    <Button onClick={handleRepopulate} variant="outlined" color="error" disabled={loading}>Repopulate</Button>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpen(false)} disabled={missingTypes.length > 0 || loading}>Done</Button>
            </DialogActions>
        </Dialog>
    );
}
