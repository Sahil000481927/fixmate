// server/permissions/permissions.js

/**
 * Permissions map: defines which roles can perform which actions.
 * This covers all actions in the project, including team/role management.
 */
const permissions = {
  // Request actions
  createRequest: ['operator', 'technician', 'lead', 'admin'],
  viewRequest: ['operator', 'technician', 'lead', 'admin'],
  updateRequest: ['technician', 'lead', 'admin'],
  deleteRequest: ['admin'],
  viewAllRequests: ['lead', 'admin'],
  updateRequestStatus: ['technician', 'lead', 'admin'],

  // Assignment actions
  assignTask: ['lead', 'admin'],
  reassignTask: ['admin'],
  unassignTask: ['admin'],
  deleteAssignment: ['admin'],
  viewAssignment: ['technician', 'lead', 'admin'],
  viewAssignments: ['technician', 'lead', 'admin'],
  getAssignmentsForUser: ['technician', 'lead', 'admin'],
  getAllAssignments: ['lead', 'admin'],

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
  viewUsers: ['lead', 'admin'],
  elevateRole: ['admin'], // Only admin can elevate roles
  demoteRole: ['admin'],
  inviteUser: ['lead', 'admin'],
  removeUser: ['admin'],
};

/**
 * Checks if a user can perform a given action, optionally on a resource.
 * @param {Object} user - The user object (must have at least a 'role' and 'uid').
 * @param {string} action - The action to check (e.g., 'deleteRequest').
 * @param {Object} [resource] - The resource being acted on (e.g., a request).
 * @returns {boolean}
 */
function canPerform(user, action, resource) {
  if (!user) return false;
  // Role-based check
  if (permissions[action]?.includes(user.role)) return true;

  // Attribute-based checks
  switch (action) {
    case 'viewRequest':
      // Creator, assigned technician, or participant can view
      if (!resource) return false;
      if (resource.createdBy === user.uid) return true;
      if (resource.assignedTo === user.uid) return true;
      if (Array.isArray(resource.participants) && resource.participants.includes(user.uid)) return true;
      return false;
    case 'updateRequest':
      // Allow creator or assigned technician to update
      if (!resource) return false;
      if (resource.createdBy === user.uid) return true;
      if (resource.assignedTo === user.uid) return true;
      return false;
    case 'viewAssignment':
      // Only admin/lead, assigned technician, or creator can view
      if (!resource) return false;
      if (user.role === 'admin' || user.role === 'lead') return true;
      if (resource.technicianId === user.uid) return true;
      if (resource.creatorId === user.uid) return true;
      return false;
    case 'elevateRole':
      // Only admin can elevate, and only to a lower or equal role
      if (user.role !== 'admin') return false;
      if (!resource || !resource.targetRole) return false;
      // Prevent elevating to admin unless user is admin
      if (resource.targetRole === 'admin' && user.role !== 'admin') return false;
      return true;
    case 'demoteRole':
      // Only admin can demote
    // ...add more attribute-based checks as needed
    default:
      return false;
  }
}

module.exports = { permissions, canPerform };
