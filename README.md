# AxisFlow - Smart Agile Project Management Platform | [Walkthrough Video](https://drive.google.com/file/d/1saww4WjEvBlcMUYgWwNfp8-M0DEEuDA7/view?usp=sharing)

AxisFlow is a production-grade, role-based, full-stack agile planning dashboard tailored for software development teams. It enables engineering teams to manage projects, user stories, and tasks while utilizing a smart metrics engine that computes real-time sprint health, predicts milestone risks, detects resource bottlenecks, and generates cron-based reports.

---

<img width="1478" height="873" alt="image" src="https://github.com/user-attachments/assets/88463685-fa31-4a95-8cdc-2bfa691f1a00" />


## 🚀 Tech Stack

### Frontend
- **React (Vite)**: Component-driven fast rendering.
- **Tailwind CSS v3**: Utility-first CSS style layout.
- **Axios**: Promised-based client for REST API communication.
- **React Router v6**: Route guard and layout management.
- **Recharts**: Responsive data visualization.
- **Lucide React**: Vector icons.

### Backend
- **Node.js & Express.js**: REST API server.
- **SQLite**: Local relational database storage.
- **Prisma ORM**: Migration, seeding, and database queries.
- **Node Cron**: Background worker scheduler.

---

## ⚙️ Core Architecture & Blueprint Design

### Multi-Tier Monorepo
AxisFlow organizes its application layers into distinct context domains:
1. **Frontend Panel**: React SPA powered by Vite. Leverages Lucide Icons for responsive comic-themed UI assets, and handles automatic 15-second status polling loops.
2. **Backend Engine**: Express API routing layer. Manages database transactions via Prisma ORM, schedules asynchronous workload analysis, and secures cookie handshakes.

### Database Entity Mapping
Relational structures are stored locally inside SQLite using Prisma models:
- **`User`**: Core account mappings containing role levels (`MANAGER`, `TEAM_LEADER`, `TEAM_MEMBER`).
- **`UserSession`**: Holds active cookie validation markers and login audit histories.
- **`Project`**: Root container representing independent client workloads (e.g. Meta AI).
- **`UserStory`**: Feature requirement collections assigned to specific Team Leaders.
- **`Task`**: Implementation blocks containing assignee detail, status, priority, and deadlines.
- **`ActivityLog`**: Global timeline audit events.
- **`ProjectReport`**: Aggregated performance logs compiled by background workers.


---

## 🔒 Axis Security Shield & Role-Based Access Control (RBAC)

The application secures database access and views using cryptographically signed **JSON Web Tokens (JWT)** housed within secure, non-accessible **HttpOnly cookies** (expiring on a 20-minute sliding window). Access controls are segmented across three isolated ranks:

### 🕸️ 1. MANAGER
- **Roster & Scope**: Global visibility. The manager holds administrative access to create projects, delete project containers, review historical access logs in the **Session Auditing** panel, and approve balancer re-assignments.
- **Limitation**: To preserve team leader autonomy, managers cannot assign tasks directly to team members (locked on the client and backend).

### ⚡ 2. TEAM LEADER
- **Roster & Scope**: Team-level visibility. Can add stories, create and assign tasks to members, approve balancer proposals, and trigger manual report compilations.
- **Boundary Restriction**: Leaders cannot delete projects or view any items assigned to other isolated teams.

### 🛡️ 3. TEAM MEMBER
- **Roster & Scope**: Task-level tracking. Enjoys access to the **My Progress** completed task gauge and the **WIP Tracking Pad** status updates.
- **Boundary Restriction**: Members cannot access iteration reports, capacity metrics of other developers, or interact with items assigned outside their specific team.


---

## 🧠 Axis Analytics & Smart Metrics Engine

The core value of AxisFlow lies in its automated analytics layer, which continuously evaluates delivery indicators directly from your workspace data.

### 1. Axis Health Score Engine
Calculates a real-time health indicator (0-100) representing project status:
- **Metrics Evaluated**: Task completion ratio ($C_{ratio}$), User Story progress ($S_{ratio}$), overdue metrics, and blockers.
- **Formulas applied**: 
  $$\text{Health Score} = \max\left(0, \min\left(100, (C_{ratio} \times 40 + S_{ratio} \times 35 + 25) - \text{Overdue Penalty} - \text{Blocked Penalty}\right)\right)$$
- **Overdue Penalty**: $-10\%$ penalty per overdue task (incomplete with passed deadlines), up to a max of $-30\%$.
- **Blocked Penalty**: $-15\%$ penalty per active task or story marked as `BLOCKED`, up to a max of $-30\%$.
- **Classifications**: 
  - 🟢 **HEALTHY** ($\ge 80$)
  - 🟡 **AT RISK** ($50-79$)
  - 🔴 **CRITICAL** ($< 50$)

---

### 2. Axis Risk Predictor
Evaluates potential delivery bottlenecks and highlights alert warnings on the dashboard:
- **Overdue Thresholds**: Flags projects if overdue tasks exceed $20\%$ of the total active scope.
- **Critical Deadlines**: Warns when uncompleted tasks have deadlines less than 48 hours away.
- **Dependency Blocks**: Immediately alerts when parent user stories are marked `BLOCKED`.

---

### 3. Capacity Balancer Recommendations
Maintains developer resource balance to avoid burnout:
- **Workload Weighting**: Assigns weights to tasks based on priority (Low = 1pt, Medium = 2pts, High = 3pts, Urgent = 5pts).
- **Imbalance Detection**: If a developer's accumulated points are $\ge 2\times$ the team average, the balancer automatically generates a suggestion.
- **Manual Approval Flow**: Recommends transferring the furthest-out low-priority tasks from the overloaded developer to an under-allocated team member (visible to the Manager for one-click approval).

---

### 4. Background Compiler (Node-Cron Scheduler)
Runs every 60 seconds to compile fresh project metrics and project report histories:
- **Pruning Policy**: Retains only the last 30 compiled reports per project to prevent database size bloat.
- **Locking & Recovery Engine**: Uses exponential backoff to handle SQLite write bottlenecks. Re-attempts execution at 2-second and 4-second intervals before yielding.


---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18+) and npm installed.

### 1. Clone & Install Dependencies
From the root workspace directory, run:
```bash
# Install dependencies for both frontend and backend automatically
npm run install:all
```

### 2. Run Database Migrations & Seeding
```bash
cd backend
npx prisma migrate dev --name init
npm run db:seed
cd ..
```

### 3. Running the Application Locally
You will need two terminal instances:

*Terminal 1 (Backend API):*
```bash
npm run start:backend
```

*Terminal 2 (Frontend React/Vite):*
```bash
npm run start:frontend
```

Once running, navigate to `http://localhost:5173` in your browser.


## ⚖️ Engineering Trade-offs & Strategic Decisions

Building a robust collaborative workspace demands picking architecture choices that prioritize safety and simplicity over unnecessary complexity.

- **SQLite Relational Engine**: Relational constraints are mandatory for mapping task-to-story-to-project hierarchies. SQLite was chosen to deliver instant local validation without requiring Docker daemons or cloud database provisioning. **Trade-off**: High concurrent write limits are managed by backend retry handles rather than high-performance server clusters (PostgreSQL).
- **Cryptographically Signed Cookies**: Traditional SPAs frequently cache JWT keys inside local storage, leaving them open to XSS token theft. AxisFlow isolates session values within HttpOnly cookies, ensuring token verification occurs strictly on backend headers.
- **Embedded Worker Threads**: Analysis cron jobs operate directly within the Node.js Express thread.
- **Trade-off**: This reduces system overhead for local development, but in massive production architectures, this workflow should be decoupled into isolated workers running task queues (like BullMQ + Redis).


---

## 🤖 Collaborative Artificial Intelligence & Design References

AxisFlow's development and design workflows integrated AI assistance and reference frameworks:
- **AI Coding & Logic Assistance (ChatGPT & Antigravity)**: Leveraged for generating relational schema definitions, building robust middleware validation structures, and implementing metric calculations.
- **UI & Aesthetic References (Stitch)**: Styled utilizing Stitch reference concepts to achieve the bold, retro-comic grid look, borders, and structured component shadows.


---

## 🔮 Roadmap & Future Enhancements

We plan to expand the AxisFlow workspace using advanced features built on our existing stack:
- **Real-Time Dashboard Sync (WebSockets)**: Integrate live WebSockets communication so that task progress updates, comments, and health score changes sync instantly across all active team member dashboards without page refreshes.
- **Interactive Visual Timelines (Gantt Charts)**: Implement responsive Gantt-style timeline charts using React on the dashboard to map out task durations, deadlines, and project milestones visually.
- **Advanced Automated Report Exports**: Expand the report generation engine to allow managers to customize date ranges, filter by specific team members, and export tailored PDF summaries.
