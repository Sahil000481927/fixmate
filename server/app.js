const express = require('express');
const cors = require('cors');
const path = require('path');
const requestRoutes = require('./routes/requestRoutes');
const assignmentsRoutes = require('./routes/assignmentsRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/requests', requestRoutes);
app.use('/api/assignments', assignmentsRoutes);

module.exports = app;
