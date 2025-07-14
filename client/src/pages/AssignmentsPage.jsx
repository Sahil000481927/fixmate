import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Select, MenuItem, CircularProgress, Snackbar, Chip, IconButton, InputAdornment, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import AppLayout from '../components/AppLayout';
import MachineTypeInterrupter from '../components/MachineTypeInterrupter';
import SearchIcon from '@mui/icons-material/Search';
import { useSnackbar } from '../components/FeedbackSnackbar';

const AssignmentsPage = () => {
  const [user] = useAuthState(auth);
  const [userRole, setUserRole] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvalDialog, setApprovalDialog] = useState({ open: false, assignment: null });
  const [editDialog, setEditDialog] = useState({ open: false, assignment: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, assignment: null });
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const POLL_INTERVAL = 10000;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showSnackbar } = useSnackbar();

  // Fetch user role and permissions from backend (like MachinesPage)
  useEffect(() => {
    const fetchUserRoleAndPermissions = async () => {
      if (user) {
        try {
          const token = await user.getIdToken();
          const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
          const res = await axios.get(`${API}/api/users/${user.uid}/permissions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserRole(res.data.role || null);
          setPermissions(res.data || {});
        } catch {
          setUserRole(null);
          setPermissions({});
        }
      }
    };
    fetchUserRoleAndPermissions();
  }, [user]);

  // Fetch assignments and technicians (with correct permissions logic)
  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const token = user && (await user.getIdToken());
      const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
      // Fetch assignments for the user (role-based, new endpoint)
      const res = await axios.get(`${API}/api/assignments/assignments-by-role`, {
        params: {
          userId: user.uid,
          role: userRole,
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignments(res.data);
      // Fetch users with technician role
      const techSnap = await axios.get(`${API}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const techList = techSnap.data.filter(u => u.role === 'technician');
      setTechnicians(techList);
    } catch (err) {
      showSnackbar('Failed to fetch assignments.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && userRole) {
      fetchData().catch(() => setLoading(false));
      const interval = setInterval(() => fetchData(false), POLL_INTERVAL);
      const timeout = setTimeout(() => setLoading(false), 5000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [user, userRole]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchData(false);
    setRefreshing(false);
  };

  // Assign a task to a technician
  const handleAssign = async (assignmentId, technicianId) => {
    try {
      const token = await user.getIdToken();
      const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
      await axios.post(`${API}/api/assignments/assign-task`, {
        taskId: assignmentId,
        technicianId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData(false);
      showSnackbar('Task assigned successfully!', 'success');
    } catch {
      showSnackbar('Failed to assign task.', 'error');
    }
  };

  // Reassign a task
  const handleReassign = async (assignmentId, newTechnicianId) => {
    try {
      const token = await user.getIdToken();
      const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
      await axios.post(`${API}/api/assignments/reassign-task`, {
        assignmentId,
        newTechnicianId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData(false);
      showSnackbar('Task reassigned successfully!', 'success');
    } catch {
      showSnackbar('Failed to reassign task.', 'error');
    }
  };

  // Unassign a task
  const handleUnassign = async (assignmentId) => {
    try {
      const token = await user.getIdToken();
      const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
      await axios.post(`${API}/api/assignments/unassign-task`, {
        assignmentId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData(false);
      showSnackbar('Task unassigned successfully!', 'success');
    } catch {
      showSnackbar('Failed to unassign task.', 'error');
    }
  };

  // Approve or reject a resolution proposal
  const handleApproveResolution = async (assignmentId, approval) => {
    try {
      const token = await user.getIdToken();
      const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
      await axios.patch(`${API}/api/assignments/${assignmentId}/approve-resolution`, {
        approval
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData(false);
      showSnackbar(`Resolution ${approval}`, 'success');
    } catch {
      showSnackbar('Failed to update approval.', 'error');
    }
  };

  // Edit assignment
  const handleEdit = async (updatedAssignment) => {
    try {
      const token = await user.getIdToken();
      const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
      await axios.patch(`${API}/api/assignments/${updatedAssignment.id}`, updatedAssignment, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData(false);
      showSnackbar('Update successful!', 'success');
      closeEditDialog();
    } catch {
      showSnackbar('Failed to update.', 'error');
    }
  };

  // Delete assignment
  const handleDelete = async (assignmentId) => {
    try {
      const token = await user.getIdToken();
      const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
      await axios.delete(`${API}/api/assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData(false);
      showSnackbar('Deleted successfully!', 'success');
    } catch {
      showSnackbar('Failed to delete.', 'error');
    } finally {
      closeDeleteDialog();
    }
  };

  const getTechName = (uid) => technicians.find(t => t.uid === uid)?.name || 'Not yet assigned';
  const canAssign = !!permissions.can_assign_tasks;
  const canApproveResolution = !!permissions.can_approve_resolution;
  const canViewAssignments = !!permissions.can_get_assignments_for_user || !!permissions.can_get_all_assignments;

  const filteredAssignments = assignments.filter(assignment =>
    assignment.title?.toLowerCase().includes(search.toLowerCase()) ||
    (assignment.status && assignment.status.toLowerCase().includes(search.toLowerCase())) ||
    (assignment.priority && assignment.priority.toLowerCase().includes(search.toLowerCase()))
  );

  const statusColor = status => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return 'warning';
      case 'in progress': return 'info';
      case 'done': return 'success';
      default: return 'default';
    }
  };

  // Helper to get dynamic approval label
  const getApprovalLabel = (assignment) => {
    if (!assignment.pendingResolution) return '';
    if (assignment.pendingResolution.status === 'Unfixable') {
      return 'Approve Proposal: Cannot Fix?';
    }
    if (assignment.pendingResolution.status === 'Resolved') {
      return 'Approve Proposal: Mark as Resolved?';
    }
    return 'Approve Proposal';
  };

  // Dialog handlers
  const openApprovalDialog = (assignment) => setApprovalDialog({ open: true, assignment });
  const closeApprovalDialog = () => setApprovalDialog({ open: false, assignment: null });
  const openEditDialog = (assignment) => setEditDialog({ open: true, assignment });
  const closeEditDialog = () => setEditDialog({ open: false, assignment: null });
  const openDeleteDialog = (assignment) => setDeleteDialog({ open: true, assignment });
  const closeDeleteDialog = () => setDeleteDialog({ open: false, assignment: null });

  // Helper to format date
  const formatDate = (dateObj) => {
    if (!dateObj) return '';
    if (typeof dateObj === 'object' && dateObj.seconds) {
      return new Date(dateObj.seconds * 1000).toLocaleString();
    }
    const d = new Date(dateObj);
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
  };

  return (
    <AppLayout activeItem="assignments">
      <MachineTypeInterrupter />
      <Box sx={{ p: { xs: 1, md: 3 }, width: '100%', maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>
            Assignments
          </Typography>
          <TextField
            size="small"
            placeholder="Search assignments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 180, maxWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <IconButton onClick={handleManualRefresh} disabled={refreshing} title="Refresh">
            <RefreshIcon color={refreshing ? 'disabled' : 'primary'} />
          </IconButton>
        </Box>
        {loading ? (
          <Paper elevation={2} sx={{ p: 0, width: '100%', minHeight: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress />
          </Paper>
        ) : isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredAssignments.length === 0 ? (
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>No assignments found.</Paper>
            ) : (
              filteredAssignments.map(assignment => (
                <Paper key={assignment.id} elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>{assignment.title}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip label={assignment.status} color={statusColor(assignment.status)} size="small" />
                    <Chip label={assignment.priority} variant="outlined" size="small" />
                  </Box>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <b>Assigned Technician:</b> {getTechName(assignment.technicianId)}
                  </Typography>
                  {canAssign && (
                    <Box sx={{ mt: 1 }}>
                      <Select
                        value={assignment.technicianId || ''}
                        displayEmpty
                        onChange={e => handleAssign(assignment.id, e.target.value)}
                        size="small"
                        sx={{ minWidth: 140 }}
                        variant="outlined"
                        disabled={!canAssign}
                      >
                        <MenuItem value="">Assign to technician</MenuItem>
                        {technicians.map(tech => (
                          <MenuItem key={tech.uid} value={tech.uid}>{tech.name}</MenuItem>
                        ))}
                      </Select>
                    </Box>
                  )}
                  {canApproveResolution && assignment.resolutionRequestStatus === 'pending_approval' && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mr: 1 }} color="primary.main">
                        {getApprovalLabel(assignment)}
                      </Typography>
                      <Button variant="outlined" size="small" onClick={() => openApprovalDialog(assignment)}>
                        Respond
                      </Button>
                    </Box>
                  )}
                </Paper>
              ))
            )}
          </Box>
        ) : (
          <Paper elevation={2} sx={{ p: 0, width: '100%', overflowX: 'auto' }}>
            <TableContainer sx={{ minWidth: 600 }}>
              <Table size="small" sx={{ minWidth: 600, fontSize: '0.92rem' }}>
                <TableHead>
                  <TableRow sx={{ height: 36 }}>
                    <TableCell sx={{ fontSize: '0.92rem', py: 0.5, px: 1 }}>Title</TableCell>
                    <TableCell sx={{ fontSize: '0.92rem', py: 0.5, px: 1 }}>Status</TableCell>
                    <TableCell sx={{ fontSize: '0.92rem', py: 0.5, px: 1 }}>Priority</TableCell>
                    <TableCell sx={{ fontSize: '0.92rem', py: 0.5, px: 1 }}>Assigned Technician</TableCell>
                    {canAssign && <TableCell sx={{ fontSize: '0.92rem', py: 0.5, px: 1 }}>Assign</TableCell>}
                    <TableCell sx={{ fontSize: '0.92rem', py: 0.5, px: 1 }}>Resolution Proposal</TableCell>
                    <TableCell sx={{ fontSize: '0.92rem', py: 0.5, px: 1 }}>Proposal Status</TableCell>
                    <TableCell sx={{ fontSize: '0.92rem', py: 0.5, px: 1 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAssignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canAssign ? 8 : 7} align="center">
                        No assignments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignments.map(assignment => (
                      <TableRow key={assignment.id} sx={{ height: 36 }}>
                        <TableCell sx={{ fontSize: '0.92rem', py: 0.5, px: 1, maxWidth: 180, wordBreak: 'break-word' }}>{assignment.title}</TableCell>
                        <TableCell sx={{ fontSize: '0.92rem', py: 0.5, px: 1 }}>
                          <Chip label={assignment.status} color={statusColor(assignment.status)} size="small" />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.92rem', py: 0.5, px: 1 }}>{assignment.priority}</TableCell>
                        <TableCell sx={{ fontSize: '0.92rem', py: 0.5, px: 1 }}>{getTechName(assignment.technicianId)}</TableCell>
                        <TableCell sx={{ fontSize: '0.92rem', py: 0.5, px: 1 }}>
                          <Select
                            value={assignment.technicianId || ''}
                            displayEmpty
                            onChange={e => handleAssign(assignment.id, e.target.value)}
                            size="small"
                            sx={{ minWidth: 120, fontSize: '0.92rem', py: 0.5, px: 1 }}
                            variant="outlined"
                            disabled={!canAssign}
                          >
                            <MenuItem value="">Assign to technician</MenuItem>
                            {technicians.map(tech => (
                              <MenuItem key={tech.uid} value={tech.uid}>{tech.name}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell>
                          {assignment.resolutionRequest ? (
                            <Chip
                              label={assignment.resolutionRequest.status}
                              color={assignment.resolutionRequest.status === 'Resolved' ? 'success' : 'error'}
                              size="small"
                            />
                          ) : (
                            <Chip label="Not Proposed" color="default" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {assignment.resolutionRequestStatus && assignment.resolutionRequestStatus !== 'not_proposed' ? (
                            <Chip
                              label={
                                assignment.resolutionRequestStatus === 'pending_approval'
                                  ? 'Pending Approval'
                                  : assignment.resolutionRequestStatus.charAt(0).toUpperCase() + assignment.resolutionRequestStatus.slice(1)
                              }
                              color={
                                assignment.resolutionRequestStatus === 'pending_approval'
                                  ? 'warning'
                                  : assignment.resolutionRequestStatus === 'approved'
                                  ? 'success'
                                  : assignment.resolutionRequestStatus === 'rejected'
                                  ? 'error'
                                  : 'default'
                              }
                              size="small"
                            />
                          ) : (
                            <Chip label="No Proposal" color="default" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', columnGap: 0.25, rowGap: 0, alignItems: 'center', flexWrap: 'wrap' }}>
                            {canApproveResolution && assignment.resolutionRequestStatus === 'pending_approval' && (
                              <IconButton color="warning" onClick={() => openApprovalDialog(assignment)} title="Respond to Proposal" sx={{ ml: 0 }}>
                                <InfoOutlinedIcon />
                              </IconButton>
                            )}
                            <IconButton color="primary" onClick={() => openEditDialog(assignment)} title="Edit" sx={{ ml: 0 }}>
                              <EditIcon />
                            </IconButton>
                            <IconButton color="error" onClick={() => openDeleteDialog(assignment)} title="Delete" sx={{ ml: 0 }}>
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
        {/* Approval Dialog */}
        <Dialog open={approvalDialog.open} onClose={closeApprovalDialog} maxWidth="xs" fullWidth>
          <DialogTitle>Review Technician Proposal</DialogTitle>
          <DialogContent>
            {approvalDialog.assignment && (
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  <b>Request:</b> {approvalDialog.assignment.title}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <b>Proposed Resolution:</b> {approvalDialog.assignment.pendingResolution?.status}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <b>Technician:</b> {getTechName(approvalDialog.assignment.pendingResolution?.by)}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <b>Proposed At:</b> {formatDate(approvalDialog.assignment.pendingResolution?.at)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {approvalDialog.assignment.description}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeApprovalDialog} color="inherit">Cancel</Button>
            <Button onClick={async () => { await handleApproveResolution(approvalDialog.assignment.assignmentId, 'approved'); closeApprovalDialog(); }} color="success" variant="contained">Approve</Button>
            <Button onClick={async () => { await handleApproveResolution(approvalDialog.assignment.assignmentId, 'rejected'); closeApprovalDialog(); }} color="error" variant="contained">Reject</Button>
          </DialogActions>
        </Dialog>
        {/* Edit Dialog */}
        <Dialog open={editDialog.open} onClose={closeEditDialog} maxWidth="xs" fullWidth>
          <DialogTitle>Edit Assignment</DialogTitle>
          <DialogContent>
            {editDialog.assignment && (
              <EditAssignmentForm
                assignment={editDialog.assignment}
                onSave={handleEdit}
                onCancel={closeEditDialog}
                technicians={technicians}
                canAssign={canAssign}
              />
            )}
          </DialogContent>
        </Dialog>
        {/* Delete Dialog */}
        <Dialog open={deleteDialog.open} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
          <DialogTitle>Delete Assignment</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete "{deleteDialog.assignment?.title}"?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog} color="inherit">Cancel</Button>
            <Button onClick={async () => { await handleDelete(deleteDialog.assignment.id); closeDeleteDialog(); }} color="error" variant="contained">Delete</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AppLayout>
  );
};

export default AssignmentsPage;

function EditAssignmentForm({ assignment, onSave, onCancel, technicians, canAssign }) {
  const [form, setForm] = React.useState({ ...assignment });
  return (
    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="Title"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        fullWidth
      />
      <TextField
        label="Description"
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        fullWidth
        multiline
        minRows={2}
      />
      <Select
        label="Priority"
        value={form.priority}
        onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
        fullWidth
        variant="outlined"
      >
        <MenuItem value="Low">Low</MenuItem>
        <MenuItem value="Medium">Medium</MenuItem>
        <MenuItem value="High">High</MenuItem>
      </Select>
      <Select
        label="Assigned Technician"
        value={form.technicianId || ''}
        onChange={e => setForm(f => ({ ...f, technicianId: e.target.value }))}
        fullWidth
        variant="outlined"
        disabled={!canAssign}
      >
        <MenuItem value="">Unassigned</MenuItem>
        {technicians.map(tech => (
          <MenuItem key={tech.uid} value={tech.uid}>{tech.name}</MenuItem>
        ))}
      </Select>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">Cancel</Button>
        <Button onClick={() => onSave(form)} color="primary" variant="contained">Save</Button>
      </DialogActions>
    </Box>
  );
}
