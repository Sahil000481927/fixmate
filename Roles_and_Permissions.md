# FixMate Roles & Permissions Manual

This manual explains how to use the FixMate app and details what each user role is permitted to do.

---

## App Overview & Main Pages

- **Dashboard:** View overall stats and recent activity.
- **Requests:** Report new equipment issues, view and track requests.
- **Assignments:** View and manage maintenance tasks assigned to users.
- **Machines:** Manage machine inventory and types.
- **Teams:** View users and manage roles (admin only).
- **Notifications:** Receive real-time updates about relevant events.
- **History:** View a log of all significant actions and changes.

---

## User Roles & Permissions

| Action/Feature                | Operator | Technician | Lead | Admin |
|-------------------------------|:--------:|:----------:|:----:|:-----:|
| **Requests**                  |          |            |      |       |
| Create request                |    ✔     |     ✔      |  ✔   |   ✔   |
| View requests                 |    ✔     |     ✔      |  ✔   |   ✔   |
| Update own request            |    ✔     |     ✔      |  ✔   |   ✔   |
| Request delete (soft)         |    ✔     |     ✔      |      |       |
| Delete request                |          |            |  ✔   |   ✔   |
| Propose resolution/fixability |          |     ✔      |      |       |
| Approve/reject resolution     |          |            |  ✔   |   ✔   |
| Assign requests               |          |            |  ✔   |   ✔   |
| Update request status         |          |            |  ✔   |   ✔   |
| **Assignments**               |          |            |      |       |
| Assign task                   |          |            |  ✔   |   ✔   |
| Update assignment             |          |            |  ✔   |   ✔   |
| View assignments              |    ✔     |     ✔      |  ✔   |   ✔   |
| Propose assignment resolution |          |     ✔      |      |       |
| Approve assignment resolution |          |            |  ✔   |   ✔   |
| **Machines**                  |          |            |      |       |
| Create/update machine         |          |            |  ✔   |   ✔   |
| Delete machine                |          |            |      |   ✔   |
| View machines                 |    ✔     |     ✔      |  ✔   |   ✔   |
| Add machine type              |          |            |  ✔   |   ✔   |
| **Teams/Users**               |          |            |      |       |
| View users                    |    ✔     |     ✔      |  ✔   |   ✔   |
| Elevate/demote user role      |          |            |      |   ✔   |
| Remove user                   |          |            |      |   ✔   |
| **Dashboard/History/Counts**  |    ✔     |     ✔      |  ✔   |   ✔   |
| **Notifications**             |    ✔     |     ✔      |  ✔   |   ✔   |
| View notifications            |    ✔     |     ✔      |  ✔   |   ✔   |
| Mark notifications as read (only admins) |          |            |      |   ✔   |

---

## Typical Workflows

- **Operators:**
  - Report new equipment issues (Requests)
  - Edit their own requests
  - Request deletion of their requests (cannot delete directly)
  - Track status of their requests

- **Technicians:**
  - View and update assigned requests/assignments
  - Propose if a request/assignment is fixable or not
  - Request deletion of their requests (cannot delete directly)
  - Track status of their requests and assignments

- **Leads:**
  - Assign requests and tasks
  - Approve or reject resolutions (including fixability proposals)
  - Manage machines
  - View all requests, assignments, and stats

- **Admins:**
  - Full access to all features
  - Manage users and roles (elevate/demote only)
  - Delete machines and requests

---

## Notes
- Operators and technicians cannot approve resolutions or mark tasks as complete; only leads and admins can approve or reject resolutions.
- Operators and technicians can only request deletion of their requests, not delete them directly.
- There is no user invitation feature; only admins can elevate or demote user roles.
- Permissions are enforced both in the UI and on the backend.
- If you believe you need additional access, contact your system administrator.

---

For more details, see the main README or contact the project maintainers.
