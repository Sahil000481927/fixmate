import React, { useEffect, useState } from 'react';
import {
  Box, Typography, CircularProgress, Chip, Button, useMediaQuery, IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AppLayout from '../components/AppLayout';
import { useSnackbar } from '../components/FeedbackSnackbar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import api from '../api/ApiClient';
import Card from '../components/Card';
import Table from '../components/Table';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import UniversalDialog from '../components/UniversalDialog';
import UniversalFormFields from '../components/UniversalFormFields';

export default function AssignmentsPage() {
  const [user] = useAuthState(auth);
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [assignments, setAssignments] = useState([]);
  const [machines, setMachines] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({});
  const [errors] = useState({});

  const [dialog, setDialog] = useState({ open: false, loading: false });
  const [form, setForm] = useState({ priority: '', technicianId: '' });
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuAssignment, setMenuAssignment] = useState(null);
  const [dialogType, setDialogType] = useState(''); // 'edit', 'assign', 'propose', 'respond'

  const [requests, setRequests] = useState([]);

  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [materialDialogContent, setMaterialDialogContent] = useState(null);
  const [materialDialogTitle, setMaterialDialogTitle] = useState('');
  const [materialDialogActions, setMaterialDialogActions] = useState([]);

  const [currentAssignment, setCurrentAssignment] = useState(null);

  // Dialog state for robust form handling
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogForm, setDialogForm] = useState({});
  const [dialogFields, setDialogFields] = useState([]);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogAction, setDialogAction] = useState('');

  // Add these field configs for propose/response
  const proposeFields = [
    { name: 'resolution', label: 'Resolution Proposal', type: 'text', required: true, multiline: true, minRows: 2 }
  ];
  const respondFields = [
    { name: 'approval', label: 'Response', type: 'select', required: true, options: [
      { value: 'approved', label: 'Approve' },
      { value: 'rejected', label: 'Reject' }
    ] }
  ];

  const assignmentFields = [
    { name: 'priority', label: 'Priority', type: 'select', required: true, options: [
        { value: 'Low', label: 'Low' },
        { value: 'Medium', label: 'Medium' },
        { value: 'High', label: 'High' },
        { value: 'Critical', label: 'Critical' }
      ] },
    { name: 'technicianId', label: 'Technician', type: 'select', required: true, options: technicians.map(t => ({ value: t.uid, label: t.name })) }
  ];

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const permRes = await api.get(`/users/${user.uid}/permissions`);
      setPermissions(permRes.data);

      const [assignRes, machineRes, techRes, reqRes] = await Promise.all([
        api.get('/assignments/assignments-by-role', { meta: { permission: 'getAssignmentsByRole' }, params: { userId: user.uid } }),
        api.get('/machines', { meta: { permission: 'viewMachines' } }),
        api.get('/users', { meta: { permission: 'viewUsers' } }),
        api.get('/requests', { meta: { permission: 'viewRequests' } })
      ]);

      // Debug: print results
      console.log('Assignments:', assignRes.data);
      console.log('Machines:', machineRes.data);
      console.log('Technicians:', techRes.data);
      console.log('Requests:', reqRes.data);

      setAssignments(assignRes.data);
      setMachines(machineRes.data);
      setTechnicians(techRes.data.filter(u => u.role === 'technician'));
      setRequests(reqRes.data);
    } catch (err) {
      showSnackbar('Failed to load data from API.', 'error');
      console.error('API fetch error:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchAllData();
  }, [user]);

  // Open MoreVert menu
  const openMenu = (event, assignment) => {
    setMenuAnchor(event.currentTarget);
    setMenuAssignment(assignment);
  };
  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuAssignment(null);
  };

  // Dialog open for action (edit/assign/propose/respond)
  const openDialog = (type, assignment) => {
    setCurrentAssignment(assignment);
    setDialogAction(type);
    const req = getRequestByRequestId(assignment?.requestId);
    const machine = getMachineById(req.machineId);
    let dialogTitle = '';
    let dialogDescription = '';
    let dialogFields = [];
    let dialogForm = {};
    let customActionLabel = '';
    setProposalStatus('');
    setRespondStatus('');
    if (type === 'edit') {
      dialogFields = [assignmentFields[0]];
      dialogForm = { priority: assignment.priority };
      dialogTitle = 'Edit Priority';
      customActionLabel = 'Save Changes';
    } else if (type === 'assign') {
      dialogFields = [assignmentFields[1]];
      dialogForm = { technicianId: assignment.technicianId };
      dialogTitle = 'Assign Technician';
      customActionLabel = 'Assign';
    } else if (type === 'propose') {
      dialogFields = [
        { name: 'description', label: 'Describe your resolution proposal', type: 'text', required: true, multiline: true, minRows: 2 }
      ];
      dialogForm = { description: '' };
      dialogTitle = 'Propose Resolution';
      dialogDescription = 'Select whether this request is resolved or unfixable, and provide a description. This will notify the lead/admin for approval.';
      customActionLabel = '';
    } else if (type === 'respond') {
      dialogFields = [];
      dialogForm = {};
      dialogTitle = 'Respond to Proposal';
      dialogDescription = 'Review the technician\'s proposal below. Approving will mark the request as resolved; rejecting will require further action.';
      customActionLabel = '';
    }
    setDialogFields(dialogFields);
    setDialogForm(dialogForm);
    setDialogTitle(dialogTitle);
    setDialogDescription(dialogDescription);
    setDialogCustomActionLabel(customActionLabel);
    setDialogOpen(true);
  };

  // Add dialogDescription and dialogCustomActionLabel state
  const [dialogDescription, setDialogDescription] = useState('');
  const [dialogCustomActionLabel, setDialogCustomActionLabel] = useState('');

  const [proposalStatus, setProposalStatus] = useState(''); // 'resolved' or 'unfixable'
  const [respondStatus, setRespondStatus] = useState(''); // 'approved' or 'rejected'

  const handleDialogFormChange = (name, value, updatedForm) => {
    setDialogForm(updatedForm);
  };

  const handleDialogSave = async (actionArg) => {
    if (!currentAssignment) return;
    setLoading(true);
    try {
      if (dialogAction === 'edit') {
        if (!dialogForm.priority) {
          showSnackbar('Please select a priority', 'error');
          setLoading(false);
          return;
        }
        await api.patch(`/assignments/${currentAssignment.id}`, { priority: dialogForm.priority }, { meta: { permission: 'updateAssignment' } });
        showSnackbar('Priority updated', 'success');
      } else if (dialogAction === 'assign') {
        if (!dialogForm.technicianId) {
          showSnackbar('Please select a technician', 'error');
          setLoading(false);
          return;
        }
        await api.patch(`/assignments/${currentAssignment.id}`, { technicianId: dialogForm.technicianId }, { meta: { permission: 'updateAssignment' } });
        showSnackbar('Technician assigned', 'success');
      } else if (dialogAction === 'propose') {
        if (!dialogForm.description || !actionArg) {
          showSnackbar('Please provide a description and select a result', 'error');
          setLoading(false);
          return;
        }
        await api.patch(`/assignments/${currentAssignment.id}/propose-resolution`, { resolution: actionArg, description: dialogForm.description }, { meta: { permission: 'proposeAssignmentResolution' } });
        showSnackbar('Proposal sent', 'success');
      } else if (dialogAction === 'respond') {
        if (!actionArg) {
          showSnackbar('Please select a response', 'error');
          setLoading(false);
          return;
        }
        await api.patch(`/assignments/${currentAssignment.id}/approve-resolution`, { approval: actionArg }, { meta: { permission: 'approveAssignmentResolution' } });
        showSnackbar('Response sent', 'success');
      }
      await fetchAllData();
      setCurrentAssignment(null);
      setDialogOpen(false);
      setDialogForm({});
      setDialogFields([]);
      setDialogTitle('');
      setDialogAction('');
      setLoading(false);
    } catch (err) {
      showSnackbar('Action failed', 'error');
      setLoading(false);
      setDialogOpen(false);
      setCurrentAssignment(null);
      setDialogForm({});
      setDialogFields([]);
      setDialogTitle('');
      setDialogAction('');
      console.error('Dialog action error:', err);
    }
  };

  // Propose dialog open
  const openProposeDialog = (assignment) => openDialog('propose', assignment);

  // Respond dialog open
  const openRespondDialog = (assignment) => openDialog('respond', assignment);

  const closeDialog = () => {
    setDialog({ open: false, loading: false });
    setForm({ priority: '', technicianId: '' });
  };

  const handleFormChange = (field, value) => {
    console.log('handleFormChange:', field, value); // Debug log
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!permissions.can_updateAssignment) {
      showSnackbar('You do not have permission to update assignments', 'error');
      return;
    }
    setDialog(prev => ({ ...prev, loading: true }));
    try {
      await api.patch(`/assignments/${dialog.assignment.id}`, form, {
        meta: { permission: 'updateAssignment' }
      });
      showSnackbar('Assignment updated successfully', 'success');
      await fetchAllData();
      closeDialog();
    } catch {
      showSnackbar('Failed to update assignment', 'error');
      setDialog(prev => ({ ...prev, loading: false }));
    }
  };

  // Custom dialog actions
  const handleDialogAction = async (action) => {
    if (!currentAssignment) return;
    setLoading(true);
    console.log('Dialog action:', action, 'Form:', form); // Debug log
    try {
      if (action === 'edit') {
        if (!form.priority) {
          showSnackbar('Please select a priority', 'error');
          setLoading(false);
          return;
        }
        await api.patch(`/assignments/${currentAssignment.id}`, { priority: form.priority }, { meta: { permission: 'updateAssignment' } });
        showSnackbar('Priority updated', 'success');
      } else if (action === 'assign') {
        if (!form.technicianId) {
          showSnackbar('Please select a technician', 'error');
          setLoading(false);
          return;
        }
        await api.patch(`/assignments/${currentAssignment.id}`, { technicianId: form.technicianId }, { meta: { permission: 'updateAssignment' } });
        showSnackbar('Technician assigned', 'success');
      } else if (action === 'propose') {
        if (!form.resolution) {
          showSnackbar('Please select a resolution', 'error');
          setLoading(false);
          return;
        }
        await api.patch(`/assignments/${currentAssignment.id}/propose-resolution`, { resolution: form.resolution }, { meta: { permission: 'proposeAssignmentResolution' } });
        showSnackbar('Proposal sent', 'success');
      } else if (action === 'respond') {
        if (!form.approval) {
          showSnackbar('Please select a response', 'error');
          setLoading(false);
          return;
        }
        await api.patch(`/assignments/${currentAssignment.id}/approve-resolution`, { approval: form.approval }, { meta: { permission: 'approveAssignmentResolution' } });
        showSnackbar('Response sent', 'success');
      }
      await fetchAllData();
      setCurrentAssignment(null);
      setMaterialDialogOpen(false);
      setDialogType('');
      setLoading(false);
    } catch (err) {
      showSnackbar('Action failed', 'error');
      setLoading(false);
      setMaterialDialogOpen(false);
      setDialogType('');
      setCurrentAssignment(null);
      console.error('Dialog action error:', err);
    }
  };

  const getMachineName = (id) => machines.find(m => m.id === id)?.name || id;

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'warning';
      case 'in progress': return 'info';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  // Helper: get request by requestId
  const getRequestByRequestId = (requestId) => requests.find(r => r.id === requestId) || {};
  // Helper: get machine by id
  const getMachineById = (id) => machines.find(m => m.id === id) || {};

  // Helper: get user name by uid
  const getUserNameById = (uid) => {
    const user = [...technicians, ...machines, ...requests].find(u => u.uid === uid || u.id === uid);
    return user?.name || uid || 'N/A';
  };

  // Helper: get proposal status
  const getProposalStatus = (a) => {
    if (!a.resolutionProposal) return 'Not Proposed';
    if (a.resolutionRequestStatus === 'pending_approval') return 'Proposed (Pending)';
    if (['approved', 'rejected'].includes(a.resolutionRequestStatus)) return 'Responded';
    return 'Not Proposed';
  };

  // Helper: get stage as one-word enum
  const getStage = (a) => {
    if (!a.resolutionProposal) return 'None';
    if (a.resolutionRequestStatus === 'pending_approval') return 'Pending';
    if (a.resolutionRequestStatus === 'approved') return 'Approved';
    if (a.resolutionRequestStatus === 'rejected') return 'Rejected';
    return 'None';
  };

  // Proposal and response as one-word enums
  const getProposalEnum = (a) => a.resolutionProposal?.status ? (a.resolutionProposal.status === 'resolved' ? 'Resolved' : 'Unfixable') : 'None';
  const getResponseEnum = (a) => {
    if (!a.resolutionRequestStatus || a.resolutionRequestStatus === 'pending_approval') return 'None';
    if (a.resolutionRequestStatus === 'approved') return 'Approved';
    if (a.resolutionRequestStatus === 'rejected') return 'Rejected';
    return 'None';
  };

  // Sort assignments: by createdAt desc, then by proposal status
  const proposalOrder = { 'Proposed (Pending)': 0, 'Not Proposed': 1, 'Responded': 2 };
  const sortedAssignments = [...assignments].sort((a, b) => {
    const aStatus = getProposalStatus(a);
    const bStatus = getProposalStatus(b);
    if (proposalOrder[aStatus] !== proposalOrder[bStatus]) {
      return proposalOrder[aStatus] - proposalOrder[bStatus];
    }
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  // Table actions menu
  const getActionsMenu = (assignment) => (
    <>
      <IconButton size="small" onClick={e => openMenu(e, assignment)}>
        <MoreVertIcon />
      </IconButton>
      <Menu anchorEl={menuAnchor} open={menuAssignment?.id === assignment.id} onClose={closeMenu}>
        {permissions.can_updateAssignment && <MenuItem onClick={() => openDialog('edit', assignment)}>Edit</MenuItem>}
        {permissions.can_updateAssignment && <MenuItem onClick={() => openDialog('assign', assignment)}>Assign</MenuItem>}
        {/* Respond option for admin/lead if proposal exists */}
        {permissions.can_approveAssignmentResolution && assignment.resolutionProposal && <MenuItem onClick={() => openRespondDialog(assignment)}>Respond</MenuItem>}
      </Menu>
    </>
  );

  // Propose button for assigned technician
  const getProposeButton = (assignment) => (
    user && assignment.technicianId === user.uid && permissions.can_proposeAssignmentResolution && !assignment.resolutionProposal ? (
      <Button size="small" variant="outlined" color="primary" onClick={() => openProposeDialog(assignment)}>
        Propose
      </Button>
    ) : null
  );

  // Table columns and rows
  const tableColumns = [
    'Title',
    'Machine',
    'Status',
    'Technician',
    'Priority',
    'Proposal',
    'Response',
    'Stage', // changed from 'Proposal Status'
    'Actions'
  ];
  // Table rows
  const tableRows = sortedAssignments.map(a => {
    const req = getRequestByRequestId(a.requestId);
    const machine = getMachineById(req.machineId);
    return {
      Title: req.title || 'Untitled',
      Machine: machine.name || req.machineId || 'Unknown Machine',
      Status: (
        <Chip
          size="small"
          label={req.status || a.status || 'Unknown'}
          color={getStatusColor(req.status || a.status || '')}
        />
      ),
      Technician: technicians.find(t => t.uid === a.technicianId)?.name || 'Unassigned',
      Priority: (
        <Chip
          size="small"
          label={req.priority || a.priority}
          color={{
            Low: 'default',
            Medium: 'info',
            High: 'warning',
            Critical: 'error'
          }[req.priority || a.priority]}
        />
      ),
      Proposal: <Chip size="small" label={getProposalEnum(a)} color={getProposalEnum(a)==='Resolved'?'success':getProposalEnum(a)==='Unfixable'?'error':'default'} />,
      Response: <Chip size="small" label={getResponseEnum(a)} color={getResponseEnum(a)==='Approved'?'success':getResponseEnum(a)==='Rejected'?'error':'default'} />,
      Stage: <Chip size="small" label={getStage(a)} color={getStage(a)==='Pending'?'warning':getStage(a)==='Approved'?'success':getStage(a)==='Rejected'?'error':'default'} />,
      Actions: (
        <>
          {getActionsMenu(a)}
          {getProposeButton(a)}
        </>
      )
    };
  });

  return (
    <AppLayout activeItem="Assignments" title="Assignments">
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {!isMobile ? (
            <Table
              columns={tableColumns}
              rows={tableRows}
              emptyMessage="No assignments found."
            />
          ) : (
            assignments.map(a => {
              const req = getRequestByRequestId(a.requestId);
              const machine = getMachineById(req.machineId);
              return (
                <Card
                  key={a.id}
                  title={req.title || ''}
                  subtitle={`Machine: ${machine.name || req.machineId || ''}`}
                  content={
                    <>
                      <Typography variant="body2">Technician: {technicians.find(t => t.uid === a.technicianId)?.name || 'Unassigned'}</Typography>
                      <Typography variant="body2">Priority: {req.priority || a.priority}</Typography>
                      <Typography variant="body2">Status: {req.status || a.status || ''}</Typography>
                    </>
                  }
                  actions={[
                    getActionsMenu(a),
                    getProposeButton(a)
                  ]}
                />
              );
            })
          )}
        </>
      )}

      {/* Material Dialog for all actions */}
      <Dialog open={materialDialogOpen} onClose={() => setMaterialDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{materialDialogTitle}</DialogTitle>
        <DialogContent>{materialDialogContent}</DialogContent>
        <DialogActions>{materialDialogActions}</DialogActions>
      </Dialog>

      <UniversalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={dialogTitle}
        actions={
          dialogAction === 'propose' ? [
            { label: 'Resolved', color: 'success', variant: 'contained', onClick: () => handleDialogSave('resolved'), loading },
            { label: 'Unfixable', color: 'error', variant: 'contained', onClick: () => handleDialogSave('unfixable'), loading },
            { label: 'Cancel', onClick: () => setDialogOpen(false) }
          ] : dialogAction === 'respond' ? [
            { label: 'Approve', color: 'success', variant: 'contained', onClick: () => handleDialogSave('approved'), loading },
            { label: 'Reject', color: 'error', variant: 'contained', onClick: () => handleDialogSave('rejected'), loading },
            { label: 'Cancel', onClick: () => setDialogOpen(false) }
          ] : [
            { label: dialogCustomActionLabel || 'Save', color: 'primary', variant: 'contained', onClick: handleDialogSave, loading },
            { label: 'Cancel', onClick: () => setDialogOpen(false) }
          ]
        }
      >
        {/* Show request summary for propose/respond */}
        {(dialogAction === 'propose' || dialogAction === 'respond') && currentAssignment && (
          <Box sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 2, background: '#fafbfc' }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Request Details</Typography>
            <Typography variant="body2"><b>Title:</b> {getRequestByRequestId(currentAssignment.requestId)?.title}</Typography>
            <Typography variant="body2"><b>Machine:</b> {getMachineById(getRequestByRequestId(currentAssignment.requestId)?.machineId)?.name}</Typography>
            <Typography variant="body2"><b>Description:</b> {getRequestByRequestId(currentAssignment.requestId)?.description}</Typography>
            <Typography variant="body2"><b>Requestor:</b> {getUserNameById(getRequestByRequestId(currentAssignment.requestId)?.createdBy) || 'N/A'}</Typography>
            <Typography variant="body2"><b>Date:</b> {getRequestByRequestId(currentAssignment.requestId)?.createdAt ? new Date(getRequestByRequestId(currentAssignment.requestId)?.createdAt).toLocaleString() : 'N/A'}</Typography>
          </Box>
        )}
        {/* Show proposal description for respond */}
        {dialogAction === 'respond' && currentAssignment?.resolutionProposal?.description && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Proposal Description</Typography>
            <Typography variant="body2">{currentAssignment.resolutionProposal.description}</Typography>
          </Box>
        )}
        {/* Show dialog description for propose/respond */}
        {dialogDescription && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{dialogDescription}</Typography>
        )}
        {/* Show form for propose only */}
        {dialogAction === 'propose' && (
          <UniversalFormFields
            fields={dialogFields}
            form={dialogForm}
            onChange={handleDialogFormChange}
          />
        )}
      </UniversalDialog>
    </AppLayout>
  );
}
