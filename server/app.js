const express = require('express');
const cors = require('cors');
const path = require('path');
const requestRoutes = require('./routes/requestRoutes');
const assignmentsRoutes = require('./routes/assignmentsRoutes');
const machinesRoutes = require('./routes/machinesRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const historyRoutes = require('./routes/historyRoutes');
const paymentsRoutes = require('./routes/paymentsRoutes');
const debugRoutes = require('./routes/debugRoutes');
const verifyFirebaseToken = require('./services/verifyFirebaseToken');

const app = express();

// Middleware
app.use(cors());

// Special handling for Stripe webhooks (raw body required for signature verification)
app.use('/api/payments/webhook', express.raw({type: 'application/json'}));

// Standard JSON parsing for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Payments routes (includes webhook route that doesn't need auth)
app.use('/api/payments', paymentsRoutes);

// Debug routes (for development/testing)
app.use('/api/debug', debugRoutes);

// Protect all other API routes with Firebase token verification
app.use('/api', verifyFirebaseToken);

// Other routes
app.use('/api/requests', requestRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/machines', machinesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/history', historyRoutes);

module.exports = app;
