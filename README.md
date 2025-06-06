# FixMate: Maintenance Request and Tracking System

FixMate is a Computerized Maintenance Management System (CMMS Lite) designed to help manufacturing teams:

- Report equipment issues
- Track request statuses
- Assign tasks to maintenance staff
- Maintain machine repair history

This repository contains the full source code for the FixMate platform, currently focused on the **Milestone 1 deliverable: Authentication Flow**.

> **Note:** This README will be updated as additional features (task management, dashboards, history logs, etc.) are developed.

---

## Project Stack

FixMate is built using the FERN stack:

- **Frontend:** React (with Material UI 3)
- **Backend:** Node.js with Express (to be integrated in Milestone 2)
- **Database & Auth:** Firebase (Firestore and Firebase Authentication)
- **Deployment:** Vercel (Frontend), Render/Firebase Functions (Backend)

---

## Repository Structure

```

fixmate/
├── client/                  # Frontend source (React + Firebase)
│   ├── src/
│   ├── public/
│   └── .env                 # Firebase client config
│
├── server/                  # Backend source (Express API) \[coming in later milestones]
│   ├── src/
│   └── .env                 # Firebase Admin SDK config
│
├── documentation/           # Screenshots, writeups, milestone docs
├── screenshots/             # UI evidence for evaluation
├── README.md                # You're reading this
└── .gitignore

````

---

## Milestone 1: Authentication Module (Current Focus)

### Features Implemented

- Signup with email, password, and full name
- Login with email/password or Google account
- Password reset via email
- Protected `/dashboard` route (user must be authenticated)
- Theme-sensitive, responsive UI with Material UI v3
- Visual feedback via contextual snackbars

---

## Setup Instructions

### Prerequisites

- Git
- Node.js (version 18 or later)
- Firebase account (console access)

---

## 1. Firebase Setup (Required First)

If you're not familiar with Firebase, follow these instructions exactly:

1. Visit [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click "Add project" and follow the prompts
3. In the Firebase console, go to:
   - **Authentication > Sign-in Method**
     - Enable `Email/Password`
     - Enable `Google` under "Providers"
   - **Project Settings > Your Apps**
     - Click the **Web App (</>)** button
     - Register the app (e.g., `FixMate Web`)
     - Firebase will generate a configuration object

---

## 2. Frontend Setup

### Step A: Clone and install

```bash
git clone https://github.com/Sahil000481927/fixmate.git
cd fixmate/client
npm install
````

### Step B: Configure `.env`

Create a file named `.env` in the `/client` directory using your Firebase config:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

> This file should never be committed to GitHub. It is for local and deployment use only.

### Step C: Run Locally

```bash
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## 3. Backend Setup (Not Yet Required)

The `/server` directory is reserved for Express-based APIs and database integration. Backend features will begin in **Milestone 2** and will include:

* Request storage
* Role-based access
* File handling
* Firestore read/write logic

No setup is required for this directory at this time.

---

## 4. Deployment (Frontend)

We recommend using [Vercel](https://vercel.com/) for frontend hosting:

1. Log in to Vercel and create a new project
2. Connect your GitHub repo
3. Select `client/` as the root directory
4. Add your `.env` values under **Project Settings > Environment Variables**
5. Set build command: `npm run build`
6. Set output directory: `dist`

Once deployed, Vercel will provide a live link to submit with your milestone.

---

## Useful Commands

```bash
# Start frontend locally
cd client
npm run dev

# Install frontend dependencies
npm install

# Build frontend for deployment
npm run build
```

---

## Known Limitations (Milestone 1)

* No database writes or task tracking
* No backend validation or file upload
* Admin panel and dashboards not yet implemented

These features are planned in Milestones 2 and 3.

---

## Contact

For questions, refer to the instructor, TA, or Firebase documentation at:
[https://firebase.google.com/docs](https://firebase.google.com/docs)
