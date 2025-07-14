const { canPerform } = require('../permissions/permissions');

/**
 * Permission middleware for Express routes.
 * Usage: permission('actionName') or permission(['action1', 'action2'], resourceFetcher)
 */
function permission(action, getResource = null) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.uid || !req.user.role) {
        return res.status(401).json({ message: 'User authentication/role required for permission check' });
      }

      const resource = getResource ? await getResource(req) : null;
      const actions = Array.isArray(action) ? action : [action];

      const allowed = actions.some(act => canPerform(req.user, act, resource));
      if (!allowed) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      next();
    } catch (err) {
      console.error('Permission middleware error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
}

module.exports = permission;
