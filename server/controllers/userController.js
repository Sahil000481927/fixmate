const { permissions, canPerform } = require('../permissions/permissions');
const admin = require('../services/firebase');
const { logHistory } = require('./historyController');

/**
 * Helper: Create a user profile in RTDB
 */
async function createUserProfile(uid, name, email, role = 'operator') {
  const db = admin.database();
  const profile = {
    name,
    email,
    role,
    is_active: true,
    createdAt: new Date().toISOString()
  };
  await db.ref(`/users/${uid}`).set(profile);
  console.log(`User profile created in RTDB for UID: ${uid}`);
}

/**
 * Helper: Get all relevant user IDs for an activity
 */
async function getRelevantUserIds({ userData, users }) {
    const relevant = new Set();
    for (const [uid, user] of Object.entries(users)) {
        if (['admin', 'lead'].includes(user.role)) relevant.add(uid);
    }
    if (userData?.uid) relevant.add(userData.uid);
    return Array.from(relevant);
}

/**
 * API: Create user profile (used during signup or invite)
 */
exports.createUserProfile = async (req, res) => {
  const { uid, name, email, role = 'operator' } = req.body;

  if (!uid || !name || !email) {
    return res.status(400).json({ error: 'Missing uid, name, or email' });
  }

  try {
    await createUserProfile(uid, name, email, role);
    res.status(201).json({ message: 'User profile created successfully' });
  } catch (err) {
    console.error('Error creating user profile:', err);
    res.status(500).json({ error: 'Failed to create user profile' });
  }
};

/**
 * API: Create own user profile after authentication
 * Allow anyone to create their own profile if not exists (no permission check)
 */
exports.createOwnProfile = async (req, res) => {
  const { uid, name, email, role } = req.user;
  try {
    const userRef = admin.database().ref(`/users/${uid}`);
    const snapshot = await userRef.once('value');

    if (snapshot.exists()) {
      // If profile exists, return success (idempotent)
      return res.status(200).json({ message: 'Profile already exists' });
    }

    await userRef.set({
      name: name || '',
      email: email || '',
      role: role || 'operator',
      is_active: true,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ message: 'User profile created successfully' });
  } catch (err) {
    console.error('Error creating own user profile:', err);
    res.status(500).json({ error: 'Failed to create user profile', details: err.message });
  }
};

/**
 * API: Ensure user profile exists (for login with Google or email)
 * This endpoint can be called after login to auto-create profile if not exists
 */
exports.ensureUserProfile = async (req, res) => {
  const { uid, name, email } = req.user;
  try {
    const userRef = admin.database().ref(`/users/${uid}`);
    const snapshot = await userRef.once('value');
    if (!snapshot.exists()) {
      await userRef.set({
        name: name || '',
        email: email || '',
        role: 'operator',
        is_active: true,
        createdAt: new Date().toISOString()
      });
    }
    res.status(200).json({ message: 'User profile ensured' });
  } catch (err) {
    console.error('Error ensuring user profile:', err);
    res.status(500).json({ error: 'Failed to ensure user profile', details: err.message });
  }
};

/**
 * Get user permissions
 */
exports.getUserPermissions = (req, res) => {
  const { uid } = req.params;

  if (req.user.uid !== uid && !canPerform(req.user, 'viewUsers')) {
    return res.status(403).json({ error: 'Not authorized to view user permissions' });
  }

  const role = req.user.role;
  if (!role) {
    return res.status(404).json({ error: 'User role not found' });
  }

  const userPerms = {};
  Object.keys(permissions).forEach(action => {
    userPerms[`can_${action}`] = canPerform(req.user, action);
  });

  userPerms.can_manage_users =
      canPerform(req.user, 'elevateRole') ||
      canPerform(req.user, 'demoteRole') ||
      canPerform(req.user, 'inviteUser') ||
      canPerform(req.user, 'removeUser');

  res.json({ role, ...userPerms });
};

/**
 * Get all users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const usersSnap = await admin.database().ref('/users').once('value');
    const usersObj = usersSnap.val() || {};

    const users = Object.entries(usersObj).map(([uid, user]) => ({
      uid,
      name: user.name || '',
      email: user.email || '',
      role: user.role || '',
      displayName: user.displayName || '',
      is_active: user.is_active || false
    }));

    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * Get user count
 */
exports.getUserCount = async (req, res) => {
  try {
    const usersSnap = await admin.database().ref('/users').once('value');
    const usersObj = usersSnap.val() || {};
    res.json({ count: Object.keys(usersObj).length });
  } catch (err) {
    console.error('Error counting users:', err);
    res.status(500).json({ error: 'Failed to count users' });
  }
};

/**
 * Update user role
 */
exports.updateUserRole = async (req, res) => {
  const { uid } = req.params;
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ error: 'Role is required' });
  }

  try {
    if (uid === req.user.uid) {
      return res.status(403).json({ error: 'Cannot modify own role' });
    }

    const userRef = admin.database().ref(`/users/${uid}`);
    const userSnap = await userRef.once('value');

    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userRef.update({ role });

    // Log history
    try {
      await logHistory({
        user: req.user,
        body: {
          action: 'Changed User Role',
          details: `Changed role of user ${userSnap.val().name || uid} to ${role}`,
          relatedResource: { userId: uid }
        }
      }, { status: () => {}, json: () => {} });
    } catch (logErr) {
      console.error('Failed to log history:', logErr);
    }

    res.json({ message: 'User role updated successfully' });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

/**
 * Delete user
 */
exports.deleteUser = async (req, res) => {
  const { uid } = req.params;

  try {
    if (uid === req.user.uid) {
      return res.status(403).json({ error: 'Cannot delete own account' });
    }

    const userRef = admin.database().ref(`/users/${uid}`);
    const userSnap = await userRef.once('value');

    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userRef.remove();

    // Log history
    try {
      await logHistory({
        user: req.user,
        body: {
          action: 'Deleted User',
          details: `Deleted user ${uid}`,
          relatedResource: { userId: uid }
        }
      }, { status: () => {}, json: () => {} });
    } catch (logErr) {
      console.error('Failed to log history:', logErr);
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
