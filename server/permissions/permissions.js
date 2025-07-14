const permissions = {
  // REQUESTS
  createRequest: ['operator', 'technician', 'lead', 'admin'], // requestController.createRequest
  viewRequest: ['operator', 'technician', 'lead', 'admin'], // requestController.getRequestById
  viewAllRequests: ['lead', 'admin', 'operator', 'technician'], // requestController.getAllRequests
  updateRequest: ['technician', 'lead', 'admin'], // requestController.updateRequest
  deleteRequest: ['admin', 'lead'], // requestController.deleteRequest
  requestDeleteRequest: ['operator', 'technician'], // requestController.requestDeleteRequest
  userApproveResolution: ['operator', 'lead', 'admin'], // requestController.updateUserApproval
  proposeResolution: ['technician'], // requestController.proposeResolution
  approveResolution: ['lead', 'admin'], // requestController.approveResolution
  getAssignableUsers: ['lead', 'admin'], // requestController.getAssignableUsers
  updateRequestStatus: ['lead', 'admin'], // requestController.updateRequestStatus

  // ASSIGNMENTS
  assignTask: ['lead', 'admin'], // assignmentsController.assignTask
  updateAssignment: ['lead', 'admin'], // assignmentsController.updateAssignment
  viewAssignment: ['operator', 'technician', 'lead', 'admin'], // assignmentsController.getAssignmentById
  getAssignmentsForUser: ['operator', 'technician', 'lead', 'admin'], // assignmentsController.getAssignmentsForUser
  getAllAssignments: ['lead', 'admin'], // assignmentsController.getAllAssignments
  getAssignmentsByRole: ['operator', 'technician', 'lead', 'admin'], // assignmentsController.getAssignmentsByRole
  proposeAssignmentResolution: ['technician'], // assignmentsController.proposeAssignmentResolution
  approveAssignmentResolution: ['lead', 'admin'], // assignmentsController.approveAssignmentResolution

  // MACHINES
  createMachine: ['lead', 'admin'], // machinesController.createMachine
  updateMachine: ['lead', 'admin'], // machinesController.updateMachine
  deleteMachine: ['admin'], // machinesController.deleteMachine
  viewMachines: ['operator', 'technician', 'lead', 'admin'], // machinesController.getMachines
  addMachineType: ['lead', 'admin'], // machinesController.addMachineType
  ensureDefaultTypes: ['admin'], // machinesController.ensureDefaultTypes
  repopulateDefaultTypes: ['admin'], // machinesController.repopulateDefaultTypes
  getMachineTypes: ['operator', 'technician', 'lead', 'admin'], // machinesController.getMachineTypes

  // USERS
  viewUsers: ['lead', 'admin', 'operator', 'technician'], // userController.getAllUsers
  inviteUser: ['lead', 'admin'], // userController.createUserProfile
  elevateRole: ['admin'], // userController.updateUserRole
  demoteRole: ['admin'], // userController.updateUserRole
  removeUser: ['admin'], // userController.deleteUser

  // DASHBOARD
  viewDashboard: ['operator', 'technician', 'lead', 'admin'], // requestController.getDashboardStats
  viewDashboardStats: ['operator', 'technician', 'lead', 'admin'], // requestController.getDashboardStats
  viewDashboardRecent: ['operator', 'technician', 'lead', 'admin'], // requestController.getDashboardRecentRequests

  // COUNTS
  countRequests: ['operator', 'technician', 'lead', 'admin'], // requestController.getRequestCount
  countMachines: ['operator', 'technician', 'lead', 'admin'], // machinesController.getMachineCount
  countAssignments: ['operator', 'technician', 'lead', 'admin'], // assignmentsController.getAssignmentCount
  countUsers: ['lead', 'admin'], // userController.getUserCount

  // HISTORY
  viewHistory: ['operator', 'technician', 'lead', 'admin'], // Filtered per role
  logHistory: ['operator', 'technician', 'lead', 'admin'], // System logs actions for all roles

  // NOTIFICATIONS
  viewNotifications: ['operator', 'technician', 'lead', 'admin'],
  updateNotifications: ['operator', 'technician', 'lead', 'admin'],
  deleteNotifications: ['admin'],
  createNotifications: ['system'], // Internal use only
};

function canPerform(user, action, resource = null) {
  const role = user.role;

  if (!permissions[action]) {
    console.warn(`Permission '${action}' is not defined in permissions.js`);
    return false;
  }

  if (!permissions[action].includes(role)) {
    return false;
  }

  // Resource-level permission for assignments: allow technician to view/update only their own assignments
  if (resource && action.startsWith('viewAssignment') && role === 'technician') {
    // resource is an assignment
    return resource.technicianId === user.uid;
  }
  if (resource && action.startsWith('updateAssignment') && role === 'technician') {
    return resource.technicianId === user.uid;
  }
  // For requests, if you ever need to check assignment, do so via assignment lookup, not assignedTo field

  return true;
}

module.exports = { permissions, canPerform };
