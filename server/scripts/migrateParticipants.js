// Migration script to add 'participants' array to all requests
// Usage: node server/scripts/migrateParticipants.js

const admin = require('firebase-admin');
const serviceAccount = require('../services/firebase.js');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.database();

async function migrateParticipants() {
  const requestsRef = db.ref('requests');
  const snapshot = await requestsRef.once('value');
  let updated = 0;

  const updates = [];
  snapshot.forEach((child) => {
    const data = child.val();
    // If participants already exists and is an array, skip
    if (Array.isArray(data.participants)) return;
    // Build participants array from createdBy and assignedTo
    const participants = [];
    if (data.createdBy) participants.push(data.createdBy);
    if (data.assignedTo && data.assignedTo !== data.createdBy) participants.push(data.assignedTo);
    // Only update if we have at least one participant
    if (participants.length > 0) {
      updates.push(child.ref.update({ participants }));
      updated++;
    }
  });
  await Promise.all(updates);
  console.log(`Migration complete. Updated ${updated} requests.`);
  process.exit(0);
}

migrateParticipants().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
