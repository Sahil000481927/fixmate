import React, { useEffect, useState } from 'react';
import {
    Box, Typography, CircularProgress, IconButton, Button, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AppLayout from '../components/AppLayout';
import { useSnackbar } from '../components/FeedbackSnackbar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import api from '../api/ApiClient';
import UniversalDialog from '../components/UniversalDialog';
import UniversalFormFields from '../components/UniversalFormFields';
import Card from '../components/Card';
import Table from '../components/Table';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

export default function MachinesPage() {
    const { showSnackbar } = useSnackbar();
    const [user] = useAuthState(auth);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [machines, setMachines] = useState([]);
    const [machineTypes, setMachineTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState({});
    // Dialog state for robust form handling
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogForm, setDialogForm] = useState({});
    const [dialogFields, setDialogFields] = useState([]);
    const [dialogTitle, setDialogTitle] = useState('');
    const [dialogAction, setDialogAction] = useState('');
    const [dialogLoading, setDialogLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [currentMachine, setCurrentMachine] = useState(null);
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [menuMachine, setMenuMachine] = useState(null);
    const [typeInput, setTypeInput] = useState('');
    const [showAddType, setShowAddType] = useState(false);

    const machineFields = [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'location', label: 'Location', type: 'text', required: true },
        { name: 'type', label: 'Type', type: 'select', required: true, options: machineTypes.map(t => ({ value: t, label: t })) },
    ];

    // Filtered machine types for dropdown
    const filteredTypes = typeInput.trim() === ''
        ? machineTypes
        : machineTypes.filter(t => t.toLowerCase().includes(typeInput.toLowerCase()));
    const canAddType = ['admin', 'lead'].includes(user?.role);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const permRes = await api.get(`/users/${user.uid}/permissions`);
            setPermissions(permRes.data);

            const [machineRes, typeRes] = await Promise.all([
                api.get('/machines', { meta: { permission: 'viewMachines' } }),
                api.get('/machines/types', { meta: { permission: 'getMachineTypes' } })
            ]);

            setMachines(machineRes.data);
            setMachineTypes(typeRes.data);
        } catch {
            showSnackbar('Failed to load machines or types', 'error');
        }
        setLoading(false);
    };

    useEffect(() => {
        if (user) fetchAllData();
    }, [user]);

    // Dialog open for create/edit
    const openDialog = (type, machine = null) => {
        setDialogAction(type);
        setCurrentMachine(machine);
        setDialogFields(machineFields);
        setTypeInput(machine ? machine.type : '');
        setShowAddType(false);
        if (type === 'edit') {
            setDialogForm({
                name: machine.name,
                location: machine.location,
                type: machine.type
            });
            setDialogTitle('Edit Machine');
        } else {
            setDialogForm({ name: '', location: '', type: '' });
            setDialogTitle('Add Machine');
        }
        setDialogOpen(true);
        setErrors({});
    };

    const handleDialogFormChange = (name, value, updatedForm) => {
        setDialogForm(updatedForm);
        setErrors({ ...errors, [name]: '' });
    };

    const handleDialogSave = async () => {
        setDialogLoading(true);
        try {
            if (dialogAction === 'edit') {
                await api.put(`/machines/${currentMachine.id}`, dialogForm, { meta: { permission: 'updateMachine' } });
                showSnackbar('Machine updated successfully', 'success');
            } else {
                await api.post(`/machines`, dialogForm, { meta: { permission: 'createMachine' } });
                showSnackbar('Machine created successfully', 'success');
            }
            await fetchAllData();
            setDialogOpen(false);
            setDialogForm({});
            setDialogFields([]);
            setDialogTitle('');
            setDialogAction('');
            setCurrentMachine(null);
        } catch {
            showSnackbar('Failed to save machine', 'error');
        }
        setDialogLoading(false);
    };

    // Add machine type handler
    const handleAddType = async () => {
        if (!typeInput || !canAddType) return;
        try {
            await api.post('/machines/types', { type: typeInput }, { meta: { permission: 'addMachineType' } });
            setMachineTypes([...machineTypes, typeInput]);
            setDialogForm({ ...dialogForm, type: typeInput });
            setShowAddType(false);
            showSnackbar('Machine type added', 'success');
        } catch {
            showSnackbar('Failed to add machine type', 'error');
        }
    };

    // Actions menu for each machine
    const openMenu = (event, machine) => {
        setMenuAnchor(event.currentTarget);
        setMenuMachine(machine);
    };
    const closeMenu = () => {
        setMenuAnchor(null);
        setMenuMachine(null);
    };

    // Table columns and rows
    const tableColumns = ['Name', 'Location', 'Type', 'Actions'];
    const tableRows = machines.map(m => ({
        Name: m.name,
        Location: m.location,
        Type: m.type,
        Actions: (
            <>
                <IconButton size="small" onClick={e => openMenu(e, m)}>
                    <MoreVertIcon />
                </IconButton>
                <Menu anchorEl={menuAnchor} open={menuMachine?.id === m.id} onClose={closeMenu}>
                    {permissions.can_updateMachine && <MenuItem onClick={() => { closeMenu(); openDialog('edit', m); }}>Edit</MenuItem>}
                    {permissions.can_deleteMachine && <MenuItem onClick={async () => { closeMenu(); await api.delete(`/machines/${m.id}`, { meta: { permission: 'deleteMachine' } }); showSnackbar('Machine deleted', 'success'); fetchAllData(); }}>Delete</MenuItem>}
                </Menu>
            </>
        )
    }));

    return (
        <AppLayout activeItem="Machines" title="Machines" mainButton={{ label: 'Add Machine', onClick: () => openDialog('add') }}>
            {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%' }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {!isMobile ? (
                        <Table columns={tableColumns} rows={tableRows} emptyMessage="No machines found." />
                    ) : (
                        machines.map(m => (
                            <Card
                                key={m.id}
                                title={m.name}
                                subtitle={`Location: ${m.location}`}
                                content={<Typography variant="body2">Type: {m.type}</Typography>}
                                actions={[
                                    <IconButton size="small" onClick={e => openMenu(e, m)}><MoreVertIcon /></IconButton>
                                ]}
                            />
                        ))
                    )}
                </>
            )}
            <UniversalDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                title={dialogTitle}
                actions={[
                    { label: dialogAction === 'edit' ? 'Save' : 'Add', color: 'primary', variant: 'contained', onClick: handleDialogSave, loading: dialogLoading },
                    { label: 'Cancel', onClick: () => setDialogOpen(false) }
                ]}
            >
                {/* Add type filter and add-type UI for admins */}
                {dialogOpen && dialogFields.some(f => f.name === 'type') && (
                    <Box sx={{ mb: 2 }}>
                        <TextField
                            label="Filter or Add Type"
                            value={typeInput}
                            onChange={e => {
                                setTypeInput(e.target.value);
                                setDialogForm({ ...dialogForm, type: e.target.value });
                                setShowAddType(canAddType && e.target.value && !machineTypes.map(t => t.toLowerCase()).includes(e.target.value.toLowerCase()));
                            }}
                            fullWidth
                        />
                        {showAddType && canAddType && (
                            <Button sx={{ mt: 1 }} variant="outlined" color="primary" onClick={handleAddType}>
                                Add "{typeInput}" as new type
                            </Button>
                        )}
                    </Box>
                )}
                <UniversalFormFields
                    fields={dialogFields.map(f => f.name === 'type' ? { ...f, options: filteredTypes.length > 0 ? filteredTypes.map(t => ({ value: t, label: t })) : machineTypes.map(t => ({ value: t, label: t })) } : f)}
                    form={dialogForm}
                    errors={errors}
                    onChange={handleDialogFormChange}
                />
            </UniversalDialog>
        </AppLayout>
    );
}
