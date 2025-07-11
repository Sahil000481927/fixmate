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
    if (!canPerform(req.user, 'viewMachines')) {
      return res.status(403).json({ error: 'Not authorized to view machines' });
    }
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
    if (!canPerform(req.user, 'createMachine')) {
      return res.status(403).json({ error: 'Not authorized to create machine' });
    }
    const { name, location, type } = req.body;
    if (!name || !location || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
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
    if (!canPerform(req.user, 'getMachineTypes')) {
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
    if (!canPerform(req.user, 'addMachineType')) {
      return res.status(403).json({ error: 'Not authorized to add machine type' });
    }
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Type name required' });
    await db.ref(MACHINE_TYPES_PATH).push({ name });
    res.status(201).json({ name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add machine type' });
  }
};

exports.ensureDefaultTypes = async (req, res) => {
  try {
    if (!canPerform(req.user, 'ensureDefaultTypes')) {
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
    if (!canPerform(req.user, 'repopulateDefaultTypes')) {
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
    if (!canPerform(req.user, 'updateMachine')) {
      return res.status(403).json({ error: 'Not authorized to update machine' });
    }
    const { id } = req.params;
    const { name, location, type } = req.body;
    const machineRef = db.ref(`machines/${id}`);
    const machineSnap = await machineRef.once('value');
    if (!machineSnap.exists()) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    const updates = {};
    if (name) updates.name = name;
    if (location) updates.location = location;
    if (type) updates.type = type;
    await machineRef.update(updates);
    res.json({ message: 'Machine updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update machine' });
  }
};

exports.deleteMachine = async (req, res) => {
  try {
    if (!canPerform(req.user, 'deleteMachine')) {
      return res.status(403).json({ error: 'Not authorized to delete machine' });
    }
    const { id } = req.params;
    const machineRef = db.ref(`machines/${id}`);
    const machineSnap = await machineRef.once('value');
    if (!machineSnap.exists()) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    await machineRef.remove();
    res.json({ message: 'Machine deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete machine' });
  }
};

exports.getMachineCount = async (req, res) => {
  try {
    if (!canPerform(req.user, 'countMachines')) {
      return res.status(403).json({ error: 'Not authorized to count machines' });
    }
    const machinesSnap = await db.ref('machines').once('value');
    const machinesObj = machinesSnap.val() || {};
    res.json({ count: Object.keys(machinesObj).length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to count machines' });
  }
};
