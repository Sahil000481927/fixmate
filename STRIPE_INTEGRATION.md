# Strategy for Integrating Stripe Payment into FixMate

## Overview

The goal is to allow users to cash out their earned points for real money using Stripe. This will involve creating a backend endpoint to handle Stripe payouts, updating the database to track user points and payouts, and adding a frontend interface for users to initiate cashouts.

---

## Workflow Breakdown

### 1. **Points System**
- Ensure that the points system is already implemented and users earn 100 points upon completing a task.
- Update the database schema to include a `points` field for each user in the `users` node and a `payouts` node to track cashout transactions in Firebase Realtime Database.

### 2. **Stripe Integration**
- Use Stripe's API to handle payouts. Since this is a sandbox environment, payouts will not be processed in real life but will simulate the functionality.

### 3. **Backend Implementation**
- Add a new route in the backend to handle cashout requests.
- Validate the user's points and ensure they meet the minimum threshold for cashout.
- Use Stripe's `Transfers` API to simulate payouts to the user's connected account.

### 4. **Frontend Implementation**
- Add a new page or modal in the frontend for users to view their points and initiate cashouts.
- Display the user's current points and allow them to request a cashout.

### 5. **Testing**
- Test the integration thoroughly in sandbox mode to ensure payouts are simulated correctly and points are deducted after cashout.

---

## File Additions and Updates

### Backend (`server/`)

1. **Add Stripe Configuration**
    - Create a new file: `server/config/stripe.js`
    - Configure Stripe with your API keys.

   ```javascript
   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

   module.exports = stripe;
   ```

2. **Update Routes**
    - Add a new route in `server/routes/payments.js` for handling cashouts.

   ```javascript
   const express = require('express');
   const router = express.Router();
   const stripe = require('../config/stripe');
   const { getUserById, updateUserPoints, createPayoutRecord } = require('../services/userService');

   router.post('/cashout', async (req, res) => {
       const { userId, amount } = req.body;

       try {
           const user = await getUserById(userId);

           if (user.points < amount) {
               return res.status(400).json({ error: 'Insufficient points' });
           }

           // Simulate payout using Stripe
           const transfer = await stripe.transfers.create({
               amount: amount * 100, // Convert to cents
               currency: 'usd',
               destination: user.stripeAccountId, // User's connected Stripe account
           });

           // Update user points and create payout record
           await updateUserPoints(userId, user.points - amount);
           await createPayoutRecord(userId, amount, transfer.id);

           res.status(200).json({ message: 'Cashout successful', transfer });
       } catch (error) {
           res.status(500).json({ error: error.message });
       }
   });

   module.exports = router;
   ```

3. **Update Services**
    - Add helper functions in `server/services/userService.js` to handle database operations using Firebase Realtime Database.

   ```javascript
   const db = require('../firebase-config');

   const getUserById = async (userId) => {
       const snapshot = await db.ref(`users/${userId}`).once('value');
       return snapshot.exists() ? snapshot.val() : null;
   };

   const updateUserPoints = async (userId, newPoints) => {
       await db.ref(`users/${userId}/points`).set(newPoints);
   };

   const createPayoutRecord = async (userId, amount, transferId) => {
       await db.ref('payouts').push({
           userId,
           amount,
           transferId,
           timestamp: new Date().toISOString(),
       });
   };

   module.exports = { getUserById, updateUserPoints, createPayoutRecord };
   ```

---

### Frontend (`client/`)

1. **Add Cashout Page**
    - Create a new page: `client/src/pages/Cashout.js`

   ```javascript
   import React, { useState, useEffect } from 'react';
   import axios from '../api/axios';

   const Cashout = () => {
       const [points, setPoints] = useState(0);
       const [amount, setAmount] = useState('');
       const [message, setMessage] = useState('');

       useEffect(() => {
           // Fetch user points
           axios.get('/user/points').then((response) => {
               setPoints(response.data.points);
           });
       }, []);

       const handleCashout = async () => {
           try {
               const response = await axios.post('/payments/cashout', { userId: 'currentUserId', amount });
               setMessage(response.data.message);
           } catch (error) {
               setMessage(error.response.data.error);
           }
       };

       return (
           <div>
               <h1>Cashout</h1>
               <p>Your Points: {points}</p>
               <input
                   type="number"
                   value={amount}
                   onChange={(e) => setAmount(e.target.value)}
                   placeholder="Enter amount to cash out"
               />
               <button onClick={handleCashout}>Cashout</button>
               {message && <p>{message}</p>}
           </div>
       );
   };

   export default Cashout;
   ```

2. **Update Navigation**
    - Add a link to the Cashout page in the navigation bar.

---

### Database Updates

1. **Users Node**
    - Add a `points` field to each user in the `users` node.
    - Add a `stripeAccountId` field to each user in the `users` node.

2. **Payouts Node**
    - Create a `payouts` node to track cashout transactions.

---

## Testing Instructions

1. Use Stripe's sandbox environment to test payouts.
2. Ensure points are deducted correctly after cashout.
3. Verify that payout records are created in the database.

---

## File Name for Documentation

`STRIPE_INTEGRATION.md`

---

## Final Notes

- Ensure environment variables for Stripe API keys are set in `server/.env`.
- Test thoroughly in sandbox mode before deploying.
- Update the `README.md` to include instructions for setting up Stripe.

---

# Implementation Compass

## Backend Implementation

To fully implement the points and payment (Stripe cashout) system in the backend, you will need to:

### 1. Create New Files
- **`server/config/stripe.js`**
  - For Stripe API configuration. This file should initialize and export the Stripe instance using your secret key from environment variables.

### 2. Modify or Create in Existing Backend Folders

- **`server/routes/`**
  - Add or update a route file (e.g., `paymentRoutes.js` or extend `userRoutes.js`) to handle:
    - Cashout requests (POST /payments/cashout)
    - Points endpoints (GET /user/points, GET /payments/history, POST /payments/approve)

- **`server/services/`**
  - Add or update a service file (e.g., `userService.js`) to handle:
    - Fetching and updating user points in Firebase Realtime Database
    - Creating payout records in the `payouts` node
    - Managing Stripe account IDs for users

- **`server/permissions/`**
  - Update `permissionMiddleware.js` to enforce role-based access for points and payment endpoints. Ensure only Technicians/Leads can request cashouts and only Admins can approve them.

- **`server/controllers/`**
  - Add or update a controller (e.g., `paymentsController.js` or extend `userController.js`) to implement the business logic for:
    - Awarding points on task completion or approval
    - Handling cashout requests and approval, including Stripe payout logic and updating the database

### 3. Summary of Backend Files to Create/Modify
- `config/stripe.js` (create)
- `routes/paymentRoutes.js` (create or update)
- `services/userService.js` (create or update)
- `controllers/paymentsController.js` (create or update)
- `permissions/permissionMiddleware.js` (update)

---

## Frontend Implementation

To provide a seamless user experience for the points and payment system, you will need to:

### 1. Create or Update Frontend Files

- **`client/src/pages/CashoutPage.jsx`**
  - Create a page for users to view their points, initiate cashouts, and view cashout history.

- **`client/src/api/ApiClient.js`**
  - Add methods for new endpoints:
    - Fetch points
    - Request cashout
    - Fetch cashout history

- **`client/src/components/PrivateRoute.jsx`**
  - Restrict access to the cashout page by user role (Technician/Lead only for cashout, Admin for approval/history).

- **Navigation (e.g., `Sidebar.jsx`)**
  - Add a link to the Cashout page for eligible users.

### 2. Key Frontend Features

- **Points Display:**
  - Show current points on the dashboard and cashout page.

- **Cashout Form:**
  - Allow eligible users to request cashout with validation (e.g., minimum points required).

- **Cashout History:**
  - Show a list of past cashout requests and their statuses.

- **Role Enforcement:**
  - Only Technicians/Leads see cashout options; only Admins see approval actions.

---

## Database Updates

- Add `points` and `stripeAccountId` fields to each user in the `users` node in Firebase Realtime Database.
- Add a `payouts` node to track cashout transactions, including user ID, amount, Stripe transfer ID, and timestamp.

---

## Testing Instructions

1. Assign and complete tasks, then verify points are awarded to Technicians and Leads.
2. Test cashout functionality in Stripe sandbox mode; ensure points are deducted and payouts are recorded in the database.
3. Verify permissions: only eligible roles can view/request/approve cashouts, and only Admins can approve cashout requests.

---
