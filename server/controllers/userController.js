const permissions = require('../permissions/permissions');

/**
 * Returns the permissions for a given user.
 * Expects req.user to be set by verifyFirebaseToken middleware.
 */
exports.getUserPermissions = (req, res) => {
  const { uid } = req.params;
  // Only allow users to fetch their own permissions or if admin/lead
  if (req.user.uid !== uid && !['admin', 'lead'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // Return the user's role and permissions
  const role = req.user.role;
  if (!role) {
    return res.status(404).json({ error: 'User role not found' });
  }
  const can_view_dashboard = permissions.viewDashboard.includes(role);
  const can_edit_requests = permissions.updateRequest.includes(role);
  const can_delete_requests = permissions.deleteRequest.includes(role);
  const can_submit_request = permissions.createRequest.includes(role);
  const can_edit_machines = permissions.updateMachine.includes(role);
  const can_view_machines = permissions.viewMachines.includes(role);
  res.json({
    role,
    can_view_dashboard,
    can_edit_requests,
    can_delete_requests,
    can_submit_request,
    can_edit_machines,
    can_view_machines
  });
};
