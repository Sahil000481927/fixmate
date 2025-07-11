const express = require('express');
const cors = require('cors');
const path = require('path');
const requestRoutes = require('./routes/requestRoutes');
const assignmentsRoutes = require('./routes/assignmentsRoutes');
const machinesRoutes = require('./routes/machinesRoutes');
const userRoutes = require('./routes/userRoutes');
const verifyFirebaseToken = require('./services/verifyFirebaseToken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Protect all API routes with Firebase token verification
app.use('/api', verifyFirebaseToken);

// Routes
app.use('/api/requests', requestRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/machines', machinesRoutes);
app.use('/api/users', userRoutes);

module.exports = app;
