const { canPerform } = require('../permissions/permissions');
const admin = require('../services/firebase');

/**
 * Permission middleware for Express routes.
 * Usage: permission('actionName')
 */
function permission(action) {
  return async (req, res, next) => {
    try {
      // Get userId from auth context, body, query, or headers
      const userId = req.user?.uid || req.body.userId || req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ message: 'User ID required for permission check' });
      }
      // Fetch user profile from RTDB
      const userSnap = await admin.database().ref(`users/${userId}`).once('value');
      const userProfile = userSnap.val();
      if (!userProfile || !userProfile.role) {
        return res.status(403).json({ message: 'User role not found in database' });
      }
      const user = { uid: userId, role: userProfile.role };
      if (!canPerform(user, action)) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      next();
    } catch (err) {
      return res.status(500).json({ message: 'Permission check failed', error: err.message });
    }
  };
}

module.exports = permission;
