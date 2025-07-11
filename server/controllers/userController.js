const { canPerform } = require('../permissions/permissions');

/**
 * Returns the permissions for a given user.
 * Expects req.user to be set by verifyFirebaseToken middleware.
 */
exports.getUserPermissions = (req, res) => {
  const { uid } = req.params;
  // Use canPerform for permission check
  if (req.user.uid !== uid && !canPerform(req.user, 'viewUsers')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // Return the user's role and permissions
  const role = req.user.role;
  if (!role) {
    return res.status(404).json({ error: 'User role not found' });
  }
  // Use canPerform for each permission
  const can_view_dashboard = canPerform(req.user, 'viewDashboard');
  const can_edit_requests = canPerform(req.user, 'updateRequest');
  const can_delete_requests = canPerform(req.user, 'deleteRequest');
  const can_submit_request = canPerform(req.user, 'createRequest');
  const can_edit_machines = canPerform(req.user, 'updateMachine');
  const can_view_machines = canPerform(req.user, 'viewMachines');
  // Add a permission for managing users (admin/lead only)
  const can_manage_users = canPerform(req.user, 'elevateRole') || canPerform(req.user, 'demoteRole') || canPerform(req.user, 'removeUser') || canPerform(req.user, 'inviteUser');
  // Add can_view_users to the permissions response
  const can_view_users = canPerform(req.user, 'viewUsers');
  // Assignment permissions
  const can_assign_tasks = canPerform(req.user, 'assignTask');
  const can_reassign_tasks = canPerform(req.user, 'reassignTask');
  const can_unassign_tasks = canPerform(req.user, 'unassignTask');
  const can_delete_assignment = canPerform(req.user, 'deleteAssignment');
  const can_get_assignments_for_user = canPerform(req.user, 'getAssignmentsForUser');
  const can_get_all_assignments = canPerform(req.user, 'getAllAssignments');
  // Add all permissions from permissions.js
  const can_view_requests = canPerform(req.user, 'viewRequests');
  const can_view_all_requests = canPerform(req.user, 'viewAllRequests');
  const can_update_request_status = canPerform(req.user, 'updateRequestStatus');
  const can_create_machine = canPerform(req.user, 'createMachine');
  const can_update_machine = canPerform(req.user, 'updateMachine');
  const can_delete_machine = canPerform(req.user, 'deleteMachine');
  const can_add_machine_type = canPerform(req.user, 'addMachineType');
  const can_get_machine_types = canPerform(req.user, 'getMachineTypes');
  const can_ensure_default_types = canPerform(req.user, 'ensureDefaultTypes');
  const can_repopulate_default_types = canPerform(req.user, 'repopulateDefaultTypes');
  const can_invite_user = canPerform(req.user, 'inviteUser');
  const can_remove_user = canPerform(req.user, 'removeUser');
  const can_count_requests = canPerform(req.user, 'countRequests');
  const can_count_machines = canPerform(req.user, 'countMachines');
  const can_count_assignments = canPerform(req.user, 'countAssignments');
  const can_count_users = canPerform(req.user, 'countUsers');
  // Add resolution permissions
  const can_propose_resolution = canPerform(req.user, 'proposeResolution');
  const can_approve_resolution = canPerform(req.user, 'approveResolution');
  res.json({
    role,
    can_view_dashboard,
    can_edit_requests,
    can_delete_requests,
    can_submit_request,
    can_view_requests,
    can_view_all_requests,
    can_update_request_status,
    can_edit_machines,
    can_create_machine,
    can_update_machine,
    can_delete_machine,
    can_view_machines,
    can_add_machine_type,
    can_get_machine_types,
    can_ensure_default_types,
    can_repopulate_default_types,
    can_manage_users,
    can_view_users,
    can_invite_user,
    can_remove_user,
    can_assign_tasks,
    can_reassign_tasks,
    can_unassign_tasks,
    can_delete_assignment,
    can_get_assignments_for_user,
    can_get_all_assignments,
    can_count_requests,
    can_count_machines,
    can_count_assignments,
    can_count_users,
    can_propose_resolution,
    can_approve_resolution
  });
};

/**
 * Returns a list of all users (basic info only).
 */
exports.getAllUsers = async (req, res) => {
  try {
    // Use canPerform for permission check
    if (!canPerform(req.user, 'viewUsers')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Fetch all users from RTDB
    const usersSnap = await require('../services/firebase').database().ref('/users').once('value');
    const usersObj = usersSnap.val() || {};
    // Convert to array and filter out sensitive info
    const users = Object.entries(usersObj).map(([uid, user]) => ({
      uid,
      name: user.name || '',
      email: user.email || '',
      role: user.role || '',
      displayName: user.displayName || ''
    }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
};

/**
 * Returns the count of users.
 */
exports.getUserCount = async (req, res) => {
  try {
    if (!canPerform(req.user, 'countUsers')) {
      return res.status(403).json({ error: 'Not authorized to count users' });
    }
    const usersSnap = await require('../services/firebase').database().ref('/users').once('value');
    const usersObj = usersSnap.val() || {};
    res.json({ count: Object.keys(usersObj).length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to count users' });
  }
};
