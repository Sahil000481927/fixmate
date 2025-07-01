import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Select, MenuItem, CircularProgress, Snackbar, Chip, IconButton, InputAdornment, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase-config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import AppLayout from '../components/AppLayout';
import rolePermissions from '../config/rolePermissions';
import { doc as firestoreDoc, getDoc } from 'firebase/firestore';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const AssignmentsPage = () => {
  const [user] = useAuthState(auth);
  const [userRole, setUserRole] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [approvalDialog, setApprovalDialog] = useState({ open: false, task: null });
  const [techDialog, setTechDialog] = useState({ open: false, task: null });
  const [editDialog, setEditDialog] = useState({ open: false, task: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, task: null });

  // Polling interval for background refresh (ms)
  const POLL_INTERVAL = 10000;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Fetch user role from Firestore
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const userRef = firestoreDoc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        setUserRole(userSnap.data()?.role || null);
      }
    };
    fetchUserRole();
  }, [user]);

  // Move fetchData to top-level so it can be reused
  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const API = import.meta.env.VITE_API_URL.replace(/\/+$|$/, '');
      console.log(`Fetching tasks for role=${userRole}, uid=${user?.uid}`);
      const res = await axios.get(`${API}/api/requests/requests-by-role`, {
        params: { userId: user?.uid, role: userRole }
      });
      setTasks(res.data);
      const techSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'technician')));
      const techList = techSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setTechnicians(techList);
    } catch {
      setError('Failed to fetch assignments.');
    }
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    if (user && userRole) {
      fetchData().catch(() => setLoading(false));
      const interval = setInterval(() => fetchData(false), POLL_INTERVAL);
      // Timeout fallback: ensure loading is cleared after 5s
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

  const handleAssign = async (taskId, technicianId) => {
    try {
      const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
      await axios.post(`${API}/api/requests/assign-task`, {
        taskId,
        technicianId,
        assignedBy: user.uid
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignedTo: technicianId, assignedBy: user.uid } : t));
      setSnackbar({ open: true, message: 'Task assigned successfully!' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to assign task.' });
    }
  };

  // Technician: Propose a resolution (pending approval)
  const handleProposeResolution = async (taskId, status) => {
    try {
      const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
      await axios.patch(`${API}/api/requests/${taskId}/propose-resolution`, {
        status,
        userId: user.uid
      });
      await fetchData(false); // Wait for server and refresh before updating UI
      setSnackbar({ open: true, message: `Resolution proposed: ${status}` });
    } catch {
      setSnackbar({ open: true, message: 'Failed to propose resolution.' });
    }
  };

  // Creator/Admin: Approve or reject a pending resolution
  const handleApproveResolution = async (taskId, approval) => {
    try {
      const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
      await axios.patch(`${API}/api/requests/${taskId}/approve-resolution`, {
        approval,
        userId: user.uid,
        role: userRole
      });
      await fetchData(false); // Wait for server and refresh before updating UI
      setSnackbar({ open: true, message: `Resolution ${approval}` });
    } catch {
      setSnackbar({ open: true, message: 'Failed to update approval.' });
    }
  };

  // Edit assignment/request
  const handleEdit = async (updatedTask) => {
    try {
      const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
      await axios.patch(`${API}/api/requests/${updatedTask.id}`, updatedTask);
      await fetchData(false);
      setSnackbar({ open: true, message: 'Update successful!' });
      closeEditDialog();
    } catch {
      setSnackbar({ open: true, message: 'Failed to update.' });
    }
  };

  // Delete assignment/request
  const handleDelete = async (taskId) => {
    try {
      const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
      await axios.delete(`${API}/api/requests/${taskId}`);
      await fetchData(false);
      setSnackbar({ open: true, message: 'Deleted successfully!' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete.' });
    } finally {
      closeDeleteDialog();
    }
  };

  const getTechName = (uid) => technicians.find(t => t.uid === uid)?.name || 'Not yet assigned';
  const canAssign = userRole && rolePermissions[userRole]?.can_assign_tasks;

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(search.toLowerCase()) ||
    (task.status && task.status.toLowerCase().includes(search.toLowerCase())) ||
    (task.priority && task.priority.toLowerCase().includes(search.toLowerCase()))
  );

  const statusColor = status => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return 'warning';
      case 'in progress': return 'info';
      case 'done': return 'success';
      default: return 'default';
    }
  };

  // Helper to get dynamic approval label for admin
  const getApprovalLabel = (task) => {
    if (!task.pendingResolution) return '';
    if (task.pendingResolution.status === 'Not Able to Fix') {
      return 'Approve Proposal: Cannot Fix?';
    }
    if (task.pendingResolution.status === 'Resolved') {
      return 'Approve Proposal: Mark as Resolved?';
    }
    return 'Approve Proposal';
  };

  // Open approval dialog
  const openApprovalDialog = (task) => setApprovalDialog({ open: true, task });
  const closeApprovalDialog = () => setApprovalDialog({ open: false, task: null });

  // Open/close technician proposal dialog
  const openTechDialog = (task) => setTechDialog({ open: true, task });
  const closeTechDialog = () => setTechDialog({ open: false, task: null });

  const openEditDialog = (task) => setEditDialog({ open: true, task });
  const closeEditDialog = () => setEditDialog({ open: false, task: null });
  const openDeleteDialog = (task) => setDeleteDialog({ open: true, task });
  const closeDeleteDialog = () => setDeleteDialog({ open: false, task: null });

  // Helper to format Firestore Timestamp or ISO string
  const formatDate = (dateObj) => {
    if (!dateObj) return '';
    // Firestore Timestamp
    if (typeof dateObj === 'object' && dateObj.seconds) {
      return new Date(dateObj.seconds * 1000).toLocaleString();
    }
    // ISO string or number
    const d = new Date(dateObj);
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
  };

  return (
    <AppLayout activeItem="Assignments">
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
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        )}
        {loading ? (
          <Paper elevation={2} sx={{ p: 0, width: '100%', minHeight: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress />
          </Paper>
        ) : isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredTasks.length === 0 ? (
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>No assignments found.</Paper>
            ) : (
              filteredTasks.map(task => (
                <Paper key={task.id} elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>{task.title}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip label={task.status} color={statusColor(task.status)} size="small" />
                    <Chip label={task.priority} variant="outlined" size="small" />
                  </Box>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <b>Assigned Technician:</b> {getTechName(task.assignedTo)}
                  </Typography>
                  {canAssign && (
                    <Box sx={{ mt: 1 }}>
                      <Select
                        value={task.assignedTo || ''}
                        displayEmpty
                        onChange={e => handleAssign(task.id, e.target.value)}
                        size="small"
                        sx={{ minWidth: 140 }}
                        variant="outlined"
                      >
                        <MenuItem value="">Assign to technician</MenuItem>
                        {technicians.map(tech => (
                          <MenuItem key={tech.uid} value={tech.uid}>{tech.name}</MenuItem>
                        ))}
                      </Select>
                    </Box>
                  )}
                  {task.assignedTo === user?.uid && !task.pendingResolution && !['Resolved', 'Not Able to Fix'].includes(task.status) && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                      <Button variant="outlined" size="small" startIcon={<InfoOutlinedIcon />} onClick={() => openTechDialog(task)}>
                        Propose Resolution
                      </Button>
                    </Box>
                  )}
                  {task.pendingResolution && (
                    <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                      Pending Approval: {task.pendingResolution.status}
                    </Typography>
                  )}
                  {(task.createdBy === user?.uid || userRole === 'admin') && task.pendingResolution && task.userApproval === 'pending' && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mr: 1 }} color="primary.main">
                        {getApprovalLabel(task)}
                      </Typography>
                      <Button variant="outlined" size="small" onClick={() => openApprovalDialog(task)}>
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
              <Table size="small" sx={{ minWidth: 600 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Assigned Technician</TableCell>
                    {canAssign && <TableCell>Assign</TableCell>}
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canAssign ? 6 : 5} align="center">
                        No assignments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map(task => (
                      <TableRow key={task.id}>
                        <TableCell sx={{ maxWidth: 180, wordBreak: 'break-word' }}>{task.title}</TableCell>
                        <TableCell>
                          <Chip label={task.status} color={statusColor(task.status)} size="small" />
                        </TableCell>
                        <TableCell>{task.priority}</TableCell>
                        <TableCell>{getTechName(task.assignedTo)}</TableCell>
                        {canAssign && (
                          <TableCell>
                            <Select
                              value={task.assignedTo || ''}
                              displayEmpty
                              onChange={e => handleAssign(task.id, e.target.value)}
                              size="small"
                              sx={{ minWidth: 140 }}
                              variant="outlined"
                            >
                              <MenuItem value="">Assign to technician</MenuItem>
                              {technicians.map(tech => (
                                <MenuItem key={tech.uid} value={tech.uid}>{tech.name}</MenuItem>
                              ))}
                            </Select>
                          </TableCell>
                        )}
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            {task.assignedTo === user?.uid && !task.pendingResolution && !['Resolved', 'Not Able to Fix'].includes(task.status) && (
                              <>
                                <IconButton color="success" onClick={() => handleProposeResolution(task.id, 'Resolved')} title="Propose as Resolved">
                                  <CheckCircleIcon />
                                </IconButton>
                                <IconButton color="error" onClick={() => handleProposeResolution(task.id, 'Not Able to Fix')} title="Propose as Not Able to Fix">
                                  <CancelIcon />
                                </IconButton>
                              </>
                            )}
                            {task.pendingResolution && (
                              <Typography variant="body2" color="warning.main" sx={{ fontWeight: 500, mr: 1 }}>
                                Pending Approval: {task.pendingResolution.status}
                              </Typography>
                            )}
                            {(task.createdBy === user?.uid || userRole === 'admin') && task.pendingResolution && task.userApproval === 'pending' && (
                              <>
                                <Typography variant="body2" sx={{ fontWeight: 500, mr: 1 }} color="primary.main">
                                  {getApprovalLabel(task)}
                                </Typography>
                                <Button variant="outlined" size="small" onClick={() => openApprovalDialog(task)}>
                                  Respond
                                </Button>
                              </>
                            )}
                            <IconButton color="primary" onClick={() => openEditDialog(task)} title="Edit">
                              <EditIcon />
                            </IconButton>
                            <IconButton color="error" onClick={() => openDeleteDialog(task)} title="Delete">
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
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ open: false, message: '' })}
          message={snackbar.message}
        />
      </Box>
      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onClose={closeApprovalDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Review Technician Proposal</DialogTitle>
        <DialogContent>
          {approvalDialog.task && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                <b>Request:</b> {approvalDialog.task.title}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <b>Proposed Resolution:</b> {approvalDialog.task.pendingResolution?.status}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <b>Technician:</b> {getTechName(approvalDialog.task.pendingResolution?.by)}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <b>Proposed At:</b> {formatDate(approvalDialog.task.pendingResolution?.at)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {approvalDialog.task.description}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeApprovalDialog} color="inherit">Cancel</Button>
          <Button onClick={async () => { await handleApproveResolution(approvalDialog.task.id, 'approved'); closeApprovalDialog(); }} color="success" variant="contained">Approve</Button>
          <Button onClick={async () => { await handleApproveResolution(approvalDialog.task.id, 'rejected'); closeApprovalDialog(); }} color="error" variant="contained">Reject</Button>
        </DialogActions>
      </Dialog>
      {/* Technician Proposal Dialog */}
      <Dialog open={techDialog.open} onClose={closeTechDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Propose Resolution</DialogTitle>
        <DialogContent>
          {techDialog.task && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                <b>Request:</b> {techDialog.task.title}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <b>Description:</b> {techDialog.task.description}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <b>Priority:</b> {techDialog.task.priority}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTechDialog} color="inherit">Cancel</Button>
          <Button onClick={async () => { await handleProposeResolution(techDialog.task.id, 'Resolved'); closeTechDialog(); }} color="success" variant="contained">Mark as Resolved</Button>
          <Button onClick={async () => { await handleProposeResolution(techDialog.task.id, 'Not Able to Fix'); closeTechDialog(); }} color="error" variant="contained">Cannot Fix</Button>
        </DialogActions>
      </Dialog>
      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={closeEditDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Assignment/Request</DialogTitle>
        <DialogContent>
          {editDialog.task && (
            <EditTaskForm
              task={editDialog.task}
              onSave={handleEdit}
              onCancel={closeEditDialog}
            />
          )}
        </DialogContent>
      </Dialog>
      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Assignment/Request</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete "{deleteDialog.task?.title}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} color="inherit">Cancel</Button>
          <Button onClick={async () => { await handleDelete(deleteDialog.task.id); closeDeleteDialog(); }} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
};

export default AssignmentsPage;

// Add this component at the bottom of the file
function EditTaskForm({ task, onSave, onCancel }) {
  const [form, setForm] = React.useState({ ...task });
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
      <DialogActions>
        <Button onClick={onCancel} color="inherit">Cancel</Button>
        <Button onClick={() => onSave(form)} color="primary" variant="contained">Save</Button>
      </DialogActions>
    </Box>
  );
}
