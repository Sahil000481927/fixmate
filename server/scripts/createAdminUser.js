require('dotenv').config();
const admin = require('firebase-admin');
const rolePermissions = require('../config/rolePermissions');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!privateKey) {
        throw new Error('FIREBASE_PRIVATE_KEY is not defined or improperly formatted in the .env file.');
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
    });
}

const auth = admin.auth();
const db = admin.firestore();

const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

// Enhanced logging and error handling
async function ensureAdminUserExists() {
    try {
        console.log('Starting admin user creation process.');

        // Check Firebase Admin SDK initialization
        if (!admin.apps.length) {
            throw new Error('Firebase Admin SDK is not initialized.');
        }

        console.log('Checking if admin user already exists.');
        const userRecord = await auth.getUserByEmail(adminEmail).catch(() => null);

        if (userRecord) {
            console.log('Admin user already exists.');
            return;
        }

        console.log('Creating admin user in Firebase Authentication.');
        const newUser = await auth.createUser({
            email: adminEmail,
            password: adminPassword,
            displayName: 'Admin',
        });

        console.log(`Admin user created in Firebase Auth with UID: ${newUser.uid}`);

        console.log('Adding admin user to Firestore.');
        const userDocRef = db.collection('users').doc(newUser.uid);
        const permissions = rolePermissions['admin'];

        await userDocRef.set({
            name: 'Admin',
            email: adminEmail,
            role: 'admin',
            permissions,
            elevatedBy: null, // Admin is the top-level user
            is_active: true,
        });

        console.log('Admin user document created in Firestore.');
    } catch (error) {
        console.error('Error ensuring admin user exists:', error);
    }
}

module.exports = { ensureAdminUserExists };
