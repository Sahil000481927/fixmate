const admin = require('firebase-admin');
const { canPerform } = require('../permissions/permissions');

// RTDB reference
const db = admin.database();
const MACHINE_TYPES_PATH = 'machineTypes';

const DEFAULT_MACHINE_TYPES = [
  'Lathe',
  'Milling Machine',
  'Drill Press',
  'Grinder',
  'CNC Machine'
];

exports.getMachines = async (req, res) => {
  try {
    // Permission already checked by middleware, just return machines
    const machinesSnap = await db.ref('machines').once('value');
    const machinesObj = machinesSnap.val() || {};
    // Return as array with id
    const machines = Object.entries(machinesObj).map(([id, m]) => ({ id, ...m }));
    res.json(machines);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
};

exports.createMachine = async (req, res) => {
  try {
    const { name, location, type } = req.body;
    if (!name || !location || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Permission already checked by middleware
    const newMachineRef = db.ref('machines').push();
    const machineData = { name, location, type, createdAt: new Date().toISOString() };
    await newMachineRef.set(machineData);
    res.status(201).json({ id: newMachineRef.key, ...machineData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create machine' });
  }
};

exports.getMachineTypes = async (req, res) => {
  try {
    const { userId, role } = req.query;
    const user = { uid: userId, role };
    if (!canPerform(user, 'getMachineTypes')) {
      return res.status(403).json({ error: 'Not authorized to view machine types' });
    }
    const snapshot = await db.ref(MACHINE_TYPES_PATH).once('value');
    const typesObj = snapshot.val() || {};
    const types = Object.values(typesObj).map(t => t.name);
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch machine types' });
  }
};

exports.addMachineType = async (req, res) => {
  try {
    const { name, userId, role } = req.body;
    if (!name) return res.status(400).json({ error: 'Type name required' });
    const user = { uid: userId, role };
    if (!canPerform(user, 'addMachineType')) {
      return res.status(403).json({ error: 'Not authorized to add machine type' });
    }
    await db.ref(MACHINE_TYPES_PATH).push({ name });
    res.status(201).json({ name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add machine type' });
  }
};

exports.ensureDefaultTypes = async (req, res) => {
  try {
    const { userId, role } = req.body;
    const user = { uid: userId, role };
    if (!canPerform(user, 'ensureDefaultTypes')) {
      return res.status(403).json({ error: 'Not authorized to ensure default types' });
    }
    const snapshot = await db.ref(MACHINE_TYPES_PATH).once('value');
    const existing = Object.values(snapshot.val() || {}).map(t => t.name);
    const missing = DEFAULT_MACHINE_TYPES.filter(type => !existing.includes(type));
    for (const type of missing) {
      await db.ref(MACHINE_TYPES_PATH).push({ name: type });
    }
    res.json({ added: missing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to ensure default types' });
  }
};

exports.repopulateDefaultTypes = async (req, res) => {
  try {
    const { userId, role } = req.body;
    const user = { uid: userId, role };
    if (!canPerform(user, 'repopulateDefaultTypes')) {
      return res.status(403).json({ error: 'Not authorized to repopulate default types' });
    }
    const snapshot = await db.ref(MACHINE_TYPES_PATH).once('value');
    const typesObj = snapshot.val() || {};
    // Delete all default types
    for (const [key, value] of Object.entries(typesObj)) {
      if (DEFAULT_MACHINE_TYPES.includes(value.name)) {
        await db.ref(`${MACHINE_TYPES_PATH}/${key}`).remove();
      }
    }
    // Repopulate with fresh default types
    for (const type of DEFAULT_MACHINE_TYPES) {
      await db.ref(MACHINE_TYPES_PATH).push({ name: type });
    }
    res.json({ repopulated: DEFAULT_MACHINE_TYPES });
  } catch (err) {
    res.status(500).json({ error: 'Failed to repopulate default types' });
  }
};

exports.updateMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;
    const user = { uid: userId, role };
    if (!canPerform(user, 'updateMachine')) {
      return res.status(403).json({ error: 'Not authorized to update machine' });
    }
    const updateData = req.body;
    if (!id || !updateData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const machineRef = db.ref(`machines/${id}`);
    const snap = await machineRef.once('value');
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    await machineRef.update(updateData);
    res.status(200).json({ message: 'Machine updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update machine' });
  }
};

exports.deleteMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;
    const user = { uid: userId, role };
    if (!canPerform(user, 'deleteMachine')) {
      return res.status(403).json({ error: 'Not authorized to delete machine' });
    }
    if (!id) {
      return res.status(400).json({ error: 'Missing machine id' });
    }
    const machineRef = db.ref(`machines/${id}`);
    const snap = await machineRef.once('value');
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    await machineRef.remove();
    res.status(200).json({ message: 'Machine deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete machine' });
  }
};
