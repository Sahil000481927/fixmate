const admin = require('firebase-admin');
require('dotenv').config(); // Load .env variables

// Safely replace \n with actual line breaks in the private key
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
    }),
});

module.exports = admin;
