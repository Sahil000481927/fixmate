const admin = require('../services/firebase');
const db = admin.database();
const { canPerform } = require('../permissions/permissions');
const { logHistory } = require('./historyController');
const { createNotification } = require('./notificationsController');

const MACHINE_TYPES_PATH = 'machineTypes';
const DEFAULT_MACHINE_TYPES = [
  'Lathe', 'Milling Machine', 'Drill Press', 'Grinder', 'CNC Machine'
];

// Helper: Get all relevant user IDs for an activity
async function getRelevantUserIds({ machineData, users }) {
    const relevant = new Set();
    for (const [uid, user] of Object.entries(users)) {
        if (['admin', 'lead'].includes(user.role)) relevant.add(uid);
    }
    if (machineData?.createdBy) relevant.add(machineData.createdBy);
    return Array.from(relevant);
}

exports.getMachines = async (req, res) => {
  try {
    const machinesSnap = await db.ref('machines').once('value');
    const machines = Object.entries(machinesSnap.val() || {}).map(([id, m]) => ({ id, ...m }));
    res.json(machines);
  } catch (err) {
    console.error('Error fetching machines:', err);
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
};

exports.createMachine = async (req, res) => {
  try {
    const { name, location, type } = req.body;
    if (!name || !location || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newMachineRef = db.ref('machines').push();
    const machineData = {
      name,
      location,
      type,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    };

    await newMachineRef.set(machineData);

    // Log history
    try {
      const usersSnap = await db.ref('users').once('value');
      const users = usersSnap.val() || {};
      const notifyUids = await getRelevantUserIds({ machineData, users });
      await logHistory({
        user: req.user,
        body: {
          action: 'Created Machine',
          details: `Machine "${name}" created by ${req.user.name || req.user.uid}`,
          relatedResource: { machineId: newMachineRef.key, userIds: notifyUids }
        }
      }, { status: () => {}, json: () => {} });
    } catch (logErr) {
      console.error('Failed to log history:', logErr);
    }
    // Notify all relevant users
    try {
      const usersSnap = await db.ref('users').once('value');
      const users = usersSnap.val() || {};
      const notifyUids = await getRelevantUserIds({ machineData, users });
      for (const uid of notifyUids) {
        await createNotification({
          userId: uid,
          title: 'New Machine',
          message: `A new machine "${name}" was created.`
        });
      }
    } catch (notifErr) {
      console.error('Failed to create notification:', notifErr);
    }

    res.status(201).json({ id: newMachineRef.key, ...machineData });
  } catch (err) {
    console.error('Error creating machine:', err);
    res.status(500).json({ error: 'Failed to create machine' });
  }
};

exports.updateMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const machineRef = db.ref(`machines/${id}`);
    const machineSnap = await machineRef.once('value');

    if (!machineSnap.exists()) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    await machineRef.update({
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    });

    // Log history
    try {
      await logHistory({
        user: req.user,
        body: {
          action: 'Updated Machine',
          details: `Machine "${id}" updated by ${req.user.name || req.user.uid}`,
          relatedResource: { machineId: id }
        }
      }, { status: () => {}, json: () => {} });
    } catch (logErr) {
      console.error('Failed to log history:', logErr);
    }
    // Notify all admins/leads
    const usersSnap = await db.ref('users').once('value');
    const users = usersSnap.val() || {};
    for (const [uid, user] of Object.entries(users)) {
      if (['admin', 'lead'].includes(user.role)) {
        try {
          await createNotification({
            userId: uid,
            title: 'Machine Updated',
            message: `Machine "${id}" was updated by ${req.user.name || req.user.uid}.`
          });
        } catch (notifErr) {
          console.error('Failed to create notification:', notifErr);
        }
      }
    }

    res.json({ message: 'Machine updated' });
  } catch (err) {
    console.error('Error updating machine:', err);
    res.status(500).json({ error: 'Failed to update machine' });
  }
};

exports.deleteMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const machineRef = db.ref(`machines/${id}`);
    const machineSnap = await machineRef.once('value');

    if (!machineSnap.exists()) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    await machineRef.remove();

    // Log history
    try {
      await logHistory({
        user: req.user,
        body: {
          action: 'Deleted Machine',
          details: `Machine "${id}" deleted by ${req.user.name || req.user.uid}`,
          relatedResource: { machineId: id }
        }
      }, { status: () => {}, json: () => {} });
    } catch (logErr) {
      console.error('Failed to log history:', logErr);
    }
    // Notify all admins/leads
    const usersSnap = await db.ref('users').once('value');
    const users = usersSnap.val() || {};
    for (const [uid, user] of Object.entries(users)) {
      if (['admin', 'lead'].includes(user.role)) {
        try {
          await createNotification({
            userId: uid,
            title: 'Machine Deleted',
            message: `Machine "${id}" was deleted by ${req.user.name || req.user.uid}.`
          });
        } catch (notifErr) {
          console.error('Failed to create notification:', notifErr);
        }
      }
    }

    res.json({ message: 'Machine deleted' });
  } catch (err) {
    console.error('Error deleting machine:', err);
    res.status(500).json({ error: 'Failed to delete machine' });
  }
};

exports.getMachineTypes = async (req, res) => {
  try {
    const typesSnap = await db.ref(MACHINE_TYPES_PATH).once('value');
    const types = Object.values(typesSnap.val() || {});
    res.json(types);
  } catch (err) {
    console.error('Error fetching machine types:', err);
    res.status(500).json({ error: 'Failed to fetch machine types' });
  }
};

exports.addMachineType = async (req, res) => {
  try {
    if (!canPerform(req.user, 'addMachineType')) {
      return res.status(403).json({ error: 'Not authorized to add machine types' });
    }
    const { type } = req.body;
    if (!type || typeof type !== 'string' || !type.trim()) {
      return res.status(400).json({ error: 'Type is required' });
    }

    const newTypeRef = db.ref(MACHINE_TYPES_PATH).push();
    await newTypeRef.set(type);
    res.status(201).json({ id: newTypeRef.key, type });

    // Check if type already exists (case-insensitive)
    const typesSnap = await db.ref(MACHINE_TYPES_PATH).once('value');
    const types = Object.values(typesSnap.val() || {});
    if (types.map(t => t.toLowerCase()).includes(type.trim().toLowerCase())) {
      return res.status(409).json({ error: 'Type already exists' });
    }
    await db.ref(MACHINE_TYPES_PATH).push(type.trim());
    res.status(201).json({ message: 'Machine type added', type: type.trim() });

  } catch (err) {
    console.error('Error adding machine type:', err);
    res.status(500).json({ error: 'Failed to add machine type' });
  }
};

exports.ensureDefaultTypes = async (req, res) => {
  try {
    const typesSnap = await db.ref(MACHINE_TYPES_PATH).once('value');
    const existingTypes = Object.values(typesSnap.val() || {});
    const missingTypes = DEFAULT_MACHINE_TYPES.filter(t => !existingTypes.includes(t));

    for (const type of missingTypes) {
      await db.ref(MACHINE_TYPES_PATH).push(type);
    }

    res.json({ message: 'Default types ensured', added: missingTypes });
  } catch (err) {
    console.error('Error ensuring default types:', err);
    res.status(500).json({ error: 'Failed to ensure default types' });
  }
};

exports.repopulateDefaultTypes = async (req, res) => {
  try {
    await db.ref(MACHINE_TYPES_PATH).remove();
    for (const type of DEFAULT_MACHINE_TYPES) {
      await db.ref(MACHINE_TYPES_PATH).push(type);
    }
    res.json({ message: 'Default types repopulated', types: DEFAULT_MACHINE_TYPES });
  } catch (err) {
    console.error('Error repopulating default types:', err);
    res.status(500).json({ error: 'Failed to repopulate default types' });
  }
};

exports.getMachineCount = async (req, res) => {
  try {
    const machinesSnap = await db.ref('machines').once('value');
    const machines = machinesSnap.val() || {};
    res.json({ count: Object.keys(machines).length });
  } catch (err) {
    console.error('Error counting machines:', err);
    res.status(500).json({ error: 'Failed to count machines' });
  }
};
