import React, { useEffect, useState } from 'react';
import api from '../api/ApiClient';
import UniversalDialog from './UniversalDialog';
import { Chip, Box, CircularProgress, Typography } from '@mui/material';

export default function MachineTypeInterrupter({ userPermissions = {} }) {
    const [open, setOpen] = useState(false);
    const [missingTypes, setMissingTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const DEFAULTS = ['Lathe', 'Milling Machine', 'Drill Press', 'Grinder', 'CNC Machine'];

    const fetchTypes = async () => {
        if (!userPermissions.can_repopulateDefaultTypes) return;
        setLoading(true);
        try {
            const res = await api.get('/machines/types', {
                meta: { permission: 'getMachineTypes' }
            });
            const types = res.data || [];
            const missing = DEFAULTS.filter(t => !types.includes(t));
            setMissingTypes(missing);
            setOpen(missing.length > 0);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch machine types.');
            setOpen(true);
        }
        setLoading(false);
    };

    const handleRepopulate = async () => {
        setLoading(true);
        try {
            await api.post('/machines/types/repopulate-defaults', {}, {
                meta: { permission: 'repopulateDefaultTypes' }
            });
            setMissingTypes([]);
            setOpen(false);
        } catch (err) {
            console.error(err);
            setError('Failed to repopulate machine types.');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTypes();
    }, [userPermissions]);

    if (!userPermissions.can_repopulateDefaultTypes) return null;

    return (
        <UniversalDialog
            open={open}
            title="Missing Default Machine Types"
            description={error || "The following default machine types are missing:"}
            actions={[
                { label: 'Repopulate Defaults', color: 'primary', variant: 'contained', onClick: handleRepopulate, disabled: loading },
                { label: 'Close', color: 'secondary', variant: 'outlined', onClick: () => setOpen(false) }
            ]}
        >
            {loading && <CircularProgress size={24} />}
            {!loading && !error && (
                <Box sx={{ mt: 2 }}>
                    {missingTypes.map(type => (
                        <Chip key={type} label={type} sx={{ mr: 1, mb: 1 }} />
                    ))}
                </Box>
            )}
        </UniversalDialog>
    );
}
