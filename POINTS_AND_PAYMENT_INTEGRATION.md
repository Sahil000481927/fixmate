# Points and Payment Integration Documentation

## Overview

This document outlines the implementation of the points system and Stripe payment integration in the FixMate project. It includes details on who earns points, permissions for initiating cashouts, and the technical steps required to implement the system.

---

## Points System

### **Who Earns Points?**
Points are awarded to **Technicians** and **Leads** for completing tasks. The breakdown is as follows:
- **Technicians:** Earn 100 points for completing maintenance tasks assigned to them.
- **Leads:** Earn 100 points for approving task resolutions or assigning tasks that are successfully completed.

### **Permissions for Points Management**
| Action                     | Operator | Technician | Lead | Admin |
|----------------------------|:--------:|:----------:|:----:|:-----:|
| Earn points                |          |     ✔      |  ✔   |       |
| View points                |    ✔     |     ✔      |  ✔   |   ✔   |
| Cashout points             |          |     ✔      |  ✔   |       |
| Approve cashout requests   |          |            |      |   ✔   |

---

## Stripe Payment Integration

### **Who Can Cash Out Points?**
Only **Technicians** and **Leads** are permitted to cash out their points for real money. **Admins** oversee the cashout process and ensure compliance.

### **Permissions for Payment Management**
| Action                     | Operator | Technician | Lead | Admin |
|----------------------------|:--------:|:----------:|:----:|:-----:|
| Initiate cashout           |          |     ✔      |  ✔   |       |
| Approve cashout requests   |          |            |      |   ✔   |
| View cashout history       |    ✔     |     ✔      |  ✔   |   ✔   |

---

## Implementation Steps

### **1. Points System**

#### **Database Updates**
- Add a `points` field to each user in the `users` node in Firebase Realtime Database.
- Add a `payouts` node to track cashout transactions.

#### **Backend Implementation**
- Update task completion logic to award points to **Technicians** and **Leads**.
- Create endpoints to fetch user points and handle cashout requests.

#### **Frontend Implementation**
- Add a section in the dashboard for users to view their points.
- Add a cashout page for **Technicians** and **Leads** to initiate cashouts.

---

### **2. Stripe Integration**

#### **Database Updates**
- Add a `stripeAccountId` field to each user in the `users` node to store connected Stripe account IDs.

#### **Backend Implementation**
- Configure Stripe API keys in `server/config/stripe.js`.
- Create a new route in `server/routes/payments.js` to handle cashout requests.

#### **Frontend Implementation**
- Add a cashout page in `client/src/pages/CashoutPage.jsx`.
- Update navigation to include the cashout page.

---

### **3. Permissions Enforcement**

#### **Backend**
- Use middleware in `server/permissions/permissionMiddleware.js` to enforce role-based access for points and payment endpoints.

#### **Frontend**
- Restrict access to the cashout page based on user roles using `client/src/components/PrivateRoute.jsx`.

---

## Testing Instructions

1. **Points System:**
   - Assign tasks to **Technicians** and **Leads**.
   - Verify that points are awarded upon task completion.

2. **Stripe Integration:**
   - Test cashout functionality in sandbox mode.
   - Ensure points are deducted correctly after cashout.

3. **Permissions:**
   - Verify that only authorized roles can view points, initiate cashouts, and approve cashout requests.

---

## Final Notes

- Ensure environment variables for Stripe API keys are set in `server/.env`.
- Update the `README.md` to include instructions for setting up the points system and Stripe integration.