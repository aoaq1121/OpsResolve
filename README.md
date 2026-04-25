# OpsResolve

OpsResolve is an AI-powered manufacturing operations management system designed to detect, analyse, and resolve scheduling conflicts between departments in real time.

---

## Overview

In manufacturing environments, multiple departments — Production, Maintenance, Quality Control, and Logistics — often schedule overlapping activities on the same machines, bays, or shifts without visibility into each other's plans. OpsResolve addresses this by automatically detecting conflicts when records are submitted and providing AI-generated analysis and resolution recommendations.

---

## Features

### New Record Submission
- Department-specific forms for Production, Maintenance, Quality Control, and Logistics
- AI Fill — upload a work order PDF or image; Gemini AI extracts all fields automatically
- AI Imputation — missing fields are suggested based on past records from the same department
- Real-time conflict detection on submit — if the new record conflicts with an existing one, a Conflict Detected modal appears immediately

### Active Conflicts
- Department-scoped conflict view — each user sees conflicts relevant to their department
- Conflict cards showing severity, departments involved, AI confidence score, and status
- Full conflict popup with:
  - Conflicting record details (title, type, location, equipment, date, shift)
  - AI analysis (what happened, why it conflicts, risk, impact)
  - AI recommendation with confidence score
  - Action buttons: Notify All, Schedule Meeting, Accept Recommendation, Override
- Show/hide resolved conflicts
- Real-time status updates — cards update immediately when action is taken

### Request Machine
- Voice or text input — describe what you need in plain language
- AI extracts machine type, shift, and date from your request
- Shows available machines matching your request
- Confirm and submit a booking

### Conflict Detection Logic
- Cross-department: same equipment OR same location + same shift + same date
- Same-department: same equipment + same shift + same date
- Dynamic AI confidence scoring based on match strength

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite), plain CSS |
| AI Backend | Node.js + Express (port 5000) |
| State Backend | Node.js + Express (port 3001) |
| Database | Firebase Firestore |
| AI — PDF Extraction | Google Gemini 2.5 Flash |
| AI — Conflict Analysis | Google Gemini 2.5 Flash |
| AI — Machine Request | Google Gemini 2.5 Flash |

---

## Project Structure

```
OpsResolve/
├── frontend/                  # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── NewRecord.jsx          # Dept-specific forms + AI fill
│       │   ├── ActiveConflicts.jsx    # Conflict list view
│       │   ├── ConflictPopup.jsx      # Conflict detail modal
│       │   ├── ConflictDetectedModal.jsx  # On-submit conflict alert
│       │   ├── RequestMachine.jsx     # Voice/text machine booking
│       │   ├── Workspace.jsx          # Main layout shell
│       │   ├── Topbar.jsx             # Navigation bar
│       │   ├── TabNavigation.jsx      # Tab switcher
│       │   └── EntryScreen.jsx        # Login screen
│       ├── constants/
│       │   └── appConstants.js        # Roles, departments, tabs
│       └── services/
│           └── aiService.js           # API calls to backends
│
├── backend/                   # AI backend (port 5000)
│   ├── controllers/
│   │   └── aiController.js    # Conflict detection + record save
│   └── services/
│       ├── glmServices.js     # Gemini API caller (agent loop)
│       └── runAgentLoop.js    # Multi-agent conflict analysis
│
└── opsresolve-backend/        # State management backend (port 3001)
    ├── server.js              # REST API endpoints
    └── services/
        └── stateManager.js    # Firebase Firestore operations
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project with Firestore enabled
- Google Gemini API key ([aistudio.google.com](https://aistudio.google.com))

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/aoaq1121/OpsResolve.git
cd OpsResolve
```

**2. Install dependencies**
```bash
cd frontend && npm install
cd ../backend && npm install
cd ../opsresolve-backend && npm install
```

**3. Configure environment variables**

Create `backend/.env`:
```
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

Place your Firebase service account key at:
```
opsresolve-backend/serviceAccountKey.json
```

**4. Start all servers**

In three separate terminals:
```bash
# Terminal 1 — Frontend
cd frontend && npm run dev

# Terminal 2 — AI Backend
cd backend && node server.js

# Terminal 3 — State Backend
cd opsresolve-backend && node server.js
```

**5. Seed demo data**

Open browser console on the app and run:
```js
fetch("http://localhost:3001/api/seed-demo", { method: "POST" }).then(r=>r.json()).then(console.log)
```

---

## Demo Walkthrough

### Part 1 — Access Levels

**Data Entry (view only)**

1. Log in as **Data Entry**, any department
2. Go to **Active Conflicts** — can see conflicts but all action buttons are hidden
3. Shows "View only — conflict coordination requires Supervisor or Manager access"

---

**Supervisor (coordinate only)**

1. Log in as **Supervisor**, Production department
2. Go to **Active Conflicts** → open any conflict
3. Can click **Notify All** — status updates to "All parties notified"
4. Can click **Schedule Meeting** — status updates to "Meeting scheduled"
5. Cannot Accept Recommendation or Override — those buttons are hidden

---

**Manager (full decision authority)**

1. Log in as **Manager**, Production department
2. Go to **Active Conflicts** → open any conflict
3. Full access — can **Accept Recommendation**, **Override**, Notify, or Schedule
4. Accept Recommendation → conflict marked as Resolved, disappears from active list
5. Override → manager types override reason → logged and resolved

---

### Part 2 — Triggering a Conflict via PDF Upload

**Step 1** — Log in as **Production**, Manager role

**Step 2** — Go to New Record → click **Upload Work Order (PDF / Image)** → upload `PROD_WO_6001.pdf`
- Gemini AI reads the PDF and fills all fields automatically
- Submit → "Record submitted successfully. No conflicts detected."

**Step 3** — Log out → log in as **Maintenance**, Manager role

**Step 4** — Go to New Record → click **Upload Work Order (PDF / Image)** → upload `MAINT_WO_6002.pdf`
- Gemini extracts equipment, date, shift from PDF
- Missing fields (Estimated Downtime, Spare Parts, Duration) are imputed from past Maintenance records
- AI Fill bar shows: "Form filled · 3 field(s) suggested from history"
- Submit → **Conflict Detected** modal appears immediately

**Step 5** — Conflict Detected modal shows:
- Both records identified with departments
- Conflict reason and AI recommendation
- Click **View Conflict Details →**

**Step 6** — Full conflict popup shows:
- Both conflicting record cards with full details
- AI analysis: What happened, Why it conflicts, Risk, Impact
- AI recommendation with confidence score (e.g. 90%)
- Click **Accept Recommendation** → conflict resolved

---

### Part 3 — Voice / Text Machine Request

1. Log in as any role, any department
2. Go to **Request Machine** tab
3. Type or speak: *"I need a welding machine at Bay 1 for tomorrow morning"*
4. Click **Search** — Gemini extracts machine type, shift, and date
5. Available machines matching the request are shown
6. Select a machine → click **Confirm & Submit**
7. Booking recorded

---

### Demo PDF Files

| File | Department | Purpose |
|------|-----------|---------|
| `PROD_WO_6001.pdf` | Production | Complete record — submit first |
| `MAINT_WO_6002.pdf` | Maintenance | Has missing fields — AI imputes from history, conflicts with 6001 |
| `WO_5001.pdf` | Production | Complete welding record |
| `WO_5002.pdf` | Production | Missing equipment + duration — same-dept conflict with 5001 |

---

## Roles

| Role | Permissions |
|------|------------|
| Data Entry | Submit records, view conflicts (read-only) |
| Supervisor | Submit records, notify parties, schedule meetings |
| Manager | Full access — accept AI recommendation, override decisions |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for PDF extraction, imputation and conflict analysis |
| `PORT` | AI backend port (default: 5000) |

> **Important:** Never commit `.env` or `serviceAccountKey.json` to version control. Both are listed in `.gitignore`.

---

## Contributing

This project is developed as part of a team project. Each team member works on a separate branch and merges to `main` via pull request.

Branch naming: `conflict-management`, `State-Management-+-Data-Layer`
