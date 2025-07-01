// Migration script to add 'participants' array to all requests
// Usage: node server/scripts/migrateParticipants.js

const admin = require('firebase-admin');
const serviceAccount = require('../services/firebase.js');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function migrateParticipants() {
  const requestsRef = db.collection('requests');
  const snapshot = await requestsRef.get();
  let updated = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    // If participants already exists and is an array, skip
    if (Array.isArray(data.participants)) continue;
    // Build participants array from createdBy and assignedTo
    const participants = [];
    if (data.createdBy) participants.push(data.createdBy);
    if (data.assignedTo && data.assignedTo !== data.createdBy) participants.push(data.assignedTo);
    // Only update if we have at least one participant
    if (participants.length > 0) {
      await doc.ref.update({ participants });
      updated++;
    }
  }
  console.log(`Migration complete. Updated ${updated} requests.`);
  process.exit(0);
}

migrateParticipants().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

