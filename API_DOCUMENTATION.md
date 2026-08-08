# AxisFlow REST API Reference

All request paths are prefixed with `/api`. Response content is returned in `application/json` format.

> [!NOTE]
> **Custom Status Code**: This API implements a custom status code **`419 Session Expired`** for sliding-window token lifecycle actions instead of generic `401`.

---

## 🔌 API Endpoints Map

| Endpoint | Method | Security Level | Description |
| :--- | :---: | :--- | :--- |
| `/auth/login` | `POST` | Public | Authenticates credentials, sets HttpOnly JWT cookie, logs `UserSession`. |
| `/auth/logout` | `POST` | Authenticated | Clears cookies, updates session record `isActive` to false. |
| `/auth/me` | `GET` | Authenticated | Decodes JWT cookie payload and returns active user details. |
| `/auth/sessions` | `GET` | `MANAGER` | Fetches last 50 session audit logs (login timestamps, active states). |
| `/projects` | `GET` | Authenticated | Lists all projects. |
| `/projects/:id` | `GET` | Authenticated | Retrieves detailed project info with stories and tasks. |
| `/projects` | `POST` | `MANAGER` | Creates a new project container. |
| `/projects/:id` | `PUT` | `MANAGER`, `TEAM_LEADER` | Updates metadata details (title, description, status). |
| `/projects/:id` | `DELETE` | `MANAGER` | Deletes a project along with cascading relations. |
| `/stories` | `GET` | Authenticated | Retrieves user stories for a project query (`?projectId=`). |
| `/stories` | `POST` | `MANAGER`, `TEAM_LEADER` | Creates a user story. |
| `/stories/:id` | `PUT` | `MANAGER`, `TEAM_LEADER` | Modifies story fields (priority, status). |
| `/stories/:id` | `DELETE` | `MANAGER` | Deletes a user story. |
| `/tasks` | `GET` | Authenticated | Retrieves tasks under user story query (`?storyId=`). |
| `/tasks/my` | `GET` | Authenticated | Lists tasks assigned to the active user profile name or email. |
| `/tasks` | `POST` | `MANAGER`, `TEAM_LEADER` | Creates and assigns tasks. |
| `/tasks/:id` | `PUT` | Authenticated | Modifies task (Team Members restricted to `status` and `priority` on assigned tasks). |
| `/tasks/:id` | `DELETE` | `MANAGER`, `TEAM_LEADER` | Deletes a task. |
| `/reports` | `GET` | `MANAGER`, `TEAM_LEADER` | Retrieves generated reports history. |
| `/reports/trigger` | `POST` | `MANAGER`, `TEAM_LEADER` | Triggers immediate real-time report generation and prunes old ones. |
| `/analytics/dashboard` | `GET` | Authenticated | Computes health metrics. Team members are restricted to viewing their own workload. |

---

## 🧪 Request & Response Payload Examples

### 1. User Login (`POST /auth/login`)

**Request Payload**:
```json
{
  "email": "manager@sprintpulse.com",
  "password": "password123"
}
```

**Response Payload**:
```json
{
  "user": {
    "id": "ae5b3df6-48c9-4fd2-8b43-bdf5349e5cf1",
    "email": "manager@sprintpulse.com",
    "name": "Alice Manager",
    "role": "MANAGER"
  },
  "sessionId": "sess_89df2314-e567-4fd2-89cd-456efb910123"
}
```

---

### 2. Analytics Dashboard Metrics (`GET /analytics/dashboard`)

Returns real-time project indicators, risks, and workload balancing assessments.

**Response Payload**:
```json
{
  "healthScore": 95,
  "riskLevel": "HEALTHY",
  "summary": {
    "completedStories": 4,
    "totalStories": 5,
    "completionRate": 80,
    "overdueTasks": 0,
    "blockedStories": 0,
    "warnings": []
  },
  "workload": {
    "averageWorkload": 2.5,
    "devWorkloads": [
      { "name": "Charlie Member", "taskCount": 2, "weight": 4 },
      { "name": "Diana Member", "taskCount": 3, "weight": 5 }
    ]
  }
}
```

---

### 3. Session Auditing logs (`GET /auth/sessions`)

**Response Payload**:
```json
[
  {
    "id": "e4f8a329-c812-4299-8ef3-28bc89efb391",
    "sessionId": "sess_89df2314-e567-4fd2-89cd-456efb910123",
    "role": "MANAGER",
    "loginAt": "2026-08-08T13:45:00.000Z",
    "expiresAt": "2026-08-08T14:05:00.000Z",
    "isActive": true,
    "user": {
      "name": "Alice Manager",
      "email": "manager@sprintpulse.com"
    }
  }
]
```
