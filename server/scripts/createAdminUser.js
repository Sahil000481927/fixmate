require('dotenv').config();
const admin = require('firebase-admin');
const { permissions } = require('../permissions/permissions');

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
const rtdb = admin.database();

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

        // Set emailVerified to true for admin
        await auth.updateUser(newUser.uid, { emailVerified: true });

        // Add admin user to RTDB under users node with error handling (Firestore removed)
        const adminProfile = {
            name: 'Admin',
            email: adminEmail,
            role: 'admin',
            elevatedBy: null, // Admin is the top-level user
            is_active: true,
            emailVerified: true,
            bypassEmailVerification: true, // Allow admin to bypass email verification
        };
        try {
            await rtdb.ref(`users/${newUser.uid}`).set(adminProfile);
            console.log('Admin user profile created in RTDB.');
        } catch (rtdbError) {
            console.error('Failed to create admin user profile in RTDB:', rtdbError);
        }

        console.log('Admin user document created in RTDB.');
    } catch (error) {
        console.error('Error ensuring admin user exists:', error);
    }
}

module.exports = { ensureAdminUserExists };
