# FixMate: Maintenance Request and Tracking System

FixMate is a Computerized Maintenance Management System (CMMS) designed for manufacturing teams to:

- Report and track equipment issues (Requests)
- Assign and manage maintenance tasks (Assignments)
- Maintain machine and repair history (Machines, History)
- Manage teams and user roles (Teams)
- Receive real-time notifications (Notifications)
- View dashboards and statistics (Dashboard)

---

## Project Stack

- **Frontend:** React (Material UI 3), Firebase Auth & Firestore
- **Backend:** Node.js, Express, Firebase Admin SDK
- **Database & Auth:** Firebase (Firestore, Authentication)
- **Deployment:** Vercel (Frontend), Render/Firebase Functions (Backend)

---

## Project Structure

```
fixmate/
├── client/                  # Frontend (React)
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Main app pages (Dashboard, Requests, Assignments, etc.)
│   │   └── firebase-config.js
│   ├── public/              # Static assets
│   └── ...
│
├── server/                  # Backend (Express API)
│   ├── controllers/         # Route controllers (assignments, history, machines, etc.)
│   ├── permissions/         # Role/permission logic
│   ├── routes/              # Express route definitions
│   ├── services/            # Firebase, storage, and utility services
│   ├── scripts/             # Admin/utility scripts
│   └── uploads/             # Uploaded files/images
│
├── README.md                # Project overview
└── ROLES_AND_PERMISSIONS.md # App usage and role permissions manual
```

---

## Main Features

- **Authentication:** Secure login/signup with Firebase Auth
- **Requests:** Report, track, and manage equipment issues
- **Assignments:** Assign and resolve maintenance tasks
- **Machines:** Manage machine inventory and types
- **Teams:** Manage users, roles, and permissions
- **Notifications:** Real-time updates for relevant events
- **Dashboard:** Overview of requests, assignments, and stats
- **History:** Audit log of actions and changes

---

## How to Run the Project

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd fixmate
   ```
2. **Frontend:**
   ```bash
   cd client
   npm install
   npm run dev
   ```
3. **Backend:**
   ```bash
   cd server
   npm install
   npm run dev
   ```
4. **Environment Variables:**
   - Configure Firebase credentials in both `client/.env` and `server/.env` as needed.

---

## Documentation

- See `ROLES_AND_PERMISSIONS.md` for a detailed manual on app usage and what each role can do.
- For screenshots and milestone documentation, see the `documentation/` and `screenshots/` folders.

---

## License

MIT License
