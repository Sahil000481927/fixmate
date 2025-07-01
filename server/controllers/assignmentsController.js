const admin = require('../services/firebase');

// Log an assignment event and update the request
exports.assignTask = async (req, res) => {
    try {
        const { taskId, technicianId, assignedBy } = req.body;
        if (!taskId || !technicianId || !assignedBy) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        const db = admin.firestore();
        // Validate assigning user
        const adminSnap = await db.collection('users').doc(assignedBy).get();
        if (!adminSnap.exists) {
            return res.status(404).json({ message: 'Assigning user not found' });
        }
        const adminData = adminSnap.data();
        if (adminData.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can assign tasks' });
        }
        // Validate technician
        const techSnap = await db.collection('users').doc(technicianId).get();
        if (!techSnap.exists || techSnap.data().is_active === false) {
            return res.status(404).json({ message: 'Technician not found or inactive' });
        }
        // Update the request
        const requestRef = db.collection('requests').doc(taskId);
        // Add technicianId to participants array if not already present
        await requestRef.update({
            assignedTo: technicianId,
            assignedBy: assignedBy,
            participants: admin.firestore.FieldValue.arrayUnion(technicianId)
        });
        // Fetch the request to get the creator
        const requestSnap = await requestRef.get();
        if (!requestSnap.exists) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const requestData = requestSnap.data();
        const creatorId = requestData.createdBy;
        // Add both creator and technician to participants array
        await requestRef.update({
            assignedTo: technicianId,
            assignedBy: assignedBy,
            participants: admin.firestore.FieldValue.arrayUnion(technicianId, creatorId)
        });
        // Log the assignment event
        await db.collection('assignments').add({
            taskId,
            technicianId,
            assignedBy,
            timestamp: new Date()
        });
        res.json({ message: 'Task assigned and logged successfully' });
    } catch (err) {
        console.error('Error assigning task:', err);
        res.status(500).json({ message: 'Failed to assign task' });
    }
};

// Get assignments for a user (technician, admin, or lead)
exports.getAssignmentsForUser = async (req, res) => {
    try {
        const { userId, role } = req.query;
        const db = admin.firestore();
        let query;
        if (role === 'technician') {
            query = db.collection('assignments').where('technicianId', '==', userId);
        } else if (role === 'admin' || role === 'lead') {
            // Admins/leads can see all assignments
            query = db.collection('assignments');
        } else {
            return res.status(403).json({ message: 'Not authorized to view assignments' });
        }
        const snapshot = await query.get();
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // If admin/lead, optionally filter by assignedBy if userId is provided
        if ((role === 'admin' || role === 'lead') && userId) {
            data = data.filter(a => a.assignedBy === userId || a.technicianId === userId);
        }
        res.json(data);
    } catch (err) {
        console.error('Error fetching assignments:', err);
        res.status(500).json({ message: 'Failed to fetch assignments' });
    }
};
