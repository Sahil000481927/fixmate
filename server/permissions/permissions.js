// server/permissions/permissions.js

/**
 * Permissions map: defines which roles can perform which actions.
 * This covers all actions in the project, including team/role management.
 */
const permissions = {
  // Request actions
  createRequest: ['operator', 'technician', 'lead', 'admin'],
  viewRequest: ['operator', 'technician', 'lead', 'admin'],
  viewRequests: ['operator', 'technician', 'lead', 'admin'], // <-- add this line for board viewing
  updateRequest: ['technician', 'lead', 'admin'],
  deleteRequest: ['admin'],
  viewAllRequests: ['lead', 'admin'],
  updateRequestStatus: ['technician', 'lead', 'admin'],

  // Assignment actions
  assignTask: ['lead', 'admin'],
  reassignTask: ['admin'],
  unassignTask: ['admin'],
  deleteAssignment: ['admin'],
  getAssignmentsForUser: ['technician', 'lead', 'admin', 'operator'],
  getAllAssignments: ['lead', 'admin'],
  getAssignmentsByRole: ['technician', 'lead', 'admin', 'operator'],

  // Resolution actions
  proposeResolution: ['technician'],
  approveResolution: ['lead', 'admin'],

  // Machine actions
  createMachine: ['lead', 'admin'],
  updateMachine: ['lead', 'admin'],
  deleteMachine: ['admin'],
  viewMachines: ['operator', 'technician', 'lead', 'admin'],
  addMachineType: ['lead', 'admin'],
  getMachineTypes: ['operator', 'technician', 'lead', 'admin'],
  ensureDefaultTypes: ['admin'],
  repopulateDefaultTypes: ['admin'],

  // Team/role management
  viewUsers: ['lead', 'admin', 'operator', 'technician'],
  elevateRole: ['admin'], // Only admin can elevate roles
  demoteRole: ['admin'],
  inviteUser: ['lead', 'admin'],
  removeUser: ['admin'],

  // Dashboard actions
  viewDashboard: ['lead', 'admin', 'operator', 'technician'],

  // Count actions (allow all roles)
  countRequests: ['operator', 'technician', 'lead', 'admin'],
  countMachines: ['operator', 'technician', 'lead', 'admin'],
  countAssignments: ['operator', 'technician', 'lead', 'admin'],
  countUsers: ['lead', 'admin', 'operator', 'technician'],
};

/**
 * Checks if a user can perform a given action, optionally on a resource.
 * @param {Object} user - The user object (must have at least a 'role' and 'uid').
 * @param {string} action - The action to check (e.g., 'deleteRequest').
 * @param {Object} [resource] - The resource being acted on (e.g., a request).
 * @returns {boolean}
 */
function canPerform(user, action, resource) {
  if (!user || !user.role) return false;
  const role = user.role;

  // Role-based permission check
  if (permissions[action] && permissions[action].includes(role)) {
    // Attribute-based checks for specific actions
    switch (action) {
      // Request actions
      case 'viewRequest':
        // Admin can view all requests
        if (role === 'admin') return true;
        // Allow if user is creator, assigned technician, or participant
        if (resource) {
          if (resource.createdBy === user.uid) return true;
          if (resource.assignedTo === user.uid) return true;
          if (Array.isArray(resource.participants) && resource.participants.includes(user.uid)) return true;
        }
        // Otherwise, fall back to role-based
        return true;
      case 'updateRequest':
        // Allow if user is creator or assigned technician
        if (resource) {
          if (resource.createdBy === user.uid) return true;
          if (resource.assignedTo === user.uid) return true;
        }
        return true;
      case 'deleteRequest':
        // Only admin can delete requests (role-based already checked)
        return true;
      case 'createRequest':
        return true;
      case 'viewAllRequests':
        return true;
      case 'updateRequestStatus':
        return true;

      // Assignment actions
      case 'assignTask':
      case 'reassignTask':
      case 'unassignTask':
      case 'deleteAssignment':
        return true;
      case 'getAssignmentsForUser':
        return true;
      case 'getAllAssignments':
        return true;
      case 'getAssignmentsByRole':
        return true;

      // Resolution actions
      case 'proposeResolution':
      case 'approveResolution':
        return true;

      // Machine actions
      case 'createMachine':
      case 'updateMachine':
      case 'deleteMachine':
      case 'viewMachines':
      case 'addMachineType':
      case 'getMachineTypes':
      case 'ensureDefaultTypes':
      case 'repopulateDefaultTypes':
        return true;

      // Team/role management
      case 'viewUsers':
        return true;
      case 'elevateRole':
        // Only admin can elevate roles, and only to a lower or equal role
        if (role !== 'admin') return false;
        if (resource && resource.targetRole === 'admin' && role !== 'admin') return false;
        return true;
      case 'demoteRole':
        // Only admin can demote
        return role === 'admin';
      case 'inviteUser':
        return true;
      case 'removeUser':
        return true;

      // Dashboard actions
      case 'viewDashboard':
        return true;
      default:
        return false;
    }
  }

  // Attribute-based checks for actions not covered by role-based
  switch (action) {
    case 'viewRequest':
      if (resource) {
        if (resource.createdBy === user.uid) return true;
        if (resource.assignedTo === user.uid) return true;
        if (Array.isArray(resource.participants) && resource.participants.includes(user.uid)) return true;
      }
      return false;
    case 'updateRequest':
      if (resource) {
        if (resource.createdBy === user.uid) return true;
        if (resource.assignedTo === user.uid) return true;
      }
      return false;
    case 'elevateRole':
      if (role !== 'admin') return false;
      if (resource && resource.targetRole === 'admin' && role !== 'admin') return false;
      return true;
    case 'demoteRole':
      return role === 'admin';
    default:
      return false;
  }
}

module.exports = { permissions, canPerform };
