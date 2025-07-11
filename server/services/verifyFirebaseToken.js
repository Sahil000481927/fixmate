const admin = require('../services/firebase');

// Express middleware to verify Firebase ID token from Authorization header
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).json({ message: 'No Firebase ID token provided' });
  }
  const idToken = match[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    // Fetch user role from RTDB
    const userSnap = await admin.database().ref(`/users/${uid}/role`).once('value');
    const role = userSnap.val();
    req.user = { uid, role };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid Firebase ID token', error: err.message });
  }
}

module.exports = verifyFirebaseToken;
