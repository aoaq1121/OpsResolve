# OpsResolve: 2-Tier Architecture

## 🎯 Overview

After analysis, we simplified the workflow to meet all hackathon requirements with **maximum clarity and minimum complexity**.

```
INPUT (User submits record)
   ↓
VALIDATION (Check required fields)
   ↓
TIER 1: Z.AI GLM (Primary)
   ├─ Stage 1: Input Understanding
   ├─ Stage 2: Conflict Detection
   ├─ Stage 3: Impact Analysis
   └─ Stage 4: Decision & Recommendation
   ↓
   ├─ Success? → Return structured JSON with GLM decision (confidence 70-90%)
   └─ Error?   → Fall back to TIER 2
   ↓
TIER 2: Rule-Based (Fallback)
   ├─ Simple keyword matching
   ├─ Time/resource overlap detection
   └─ Return same JSON format (confidence 40%)
   ↓
RESPONSE (Structured JSON with all 4 stages)
```

---

## 📋 Why This Architecture?

### ✅ Meets All 6 Hackathon Requirements

| Requirement | How Met |
|---|---|
| **1. GLM as core engine** | Primary decision maker in `aiController.js` |
| **2. Structured reasoning** | 4-stage pipeline in `glmServices.js` |
| **3. Real workflow automation** | Input → GLM → Decision → Action |
| **4. Backend API integration** | `/api/submit-record` endpoint |
| **5. Conflict detection** | Stage 2 detects conflicts |
| **6. Explainable AI output** | All 4 stages + confidence + rationale |

### 🚀 Advantages

- **Clear:** Easy to understand and explain to judges
- **Resilient:** Fallback ensures system always works
- **Fast:** No unnecessary overhead layers
- **Debuggable:** Simple flow = easy to trace issues
- **Production-ready:** Can be extended later

---

## 🔧 Core Components

### File 1: `glmServices.js`
**What it does:** Communicates with Z.AI GLM API

**Key function:** `callGLMWithZ(agentType, data)`

**What it handles:**
- 4 stage prompts (input understanding, conflict detection, impact analysis, decision)
- Z.AI API request/response
- JSON parsing
- Error handling

**Returns:**
```json
{
  "error": null,
  "data": {
    "stage1_understanding": { /* ... */ },
    "stage2_conflict_detection": { /* ... */ },
    "stage3_impact_analysis": { /* ... */ },
    "stage4_decision": { /* ... */ }
  }
}
```

### File 2: `aiController.js`
**What it does:** HTTP endpoint that orchestrates the 2-tier workflow

**Request:** `POST /api/submit-record`
```json
{
  "title": "Machine maintenance",
  "category": "Maintenance Request",
  "description": "Need to service Machine A tomorrow"
}
```

**Flow:**
1. Validate input
2. Call GLM (TIER 1)
3. If GLM succeeds → Return GLM response
4. If GLM fails → Use rule-based detection (TIER 2) → Return fallback response
5. Both responses have same structure (4 stages)

**Returns:**
```json
{
  "success": true,
  "data": {
    "executionId": "exec_1234567890",
    "source": "z-ai-glm",
    "processingTime": 2345,
    "timestamp": "2024-04-22T...",
    "input_understanding": { /* Stage 1 */ },
    "conflict_analysis": { /* Stage 2 */ },
    "impact_analysis": { /* Stage 3 */ },
    "decision": { /* Stage 4 */ },
    "glm_reasoning": { /* Full GLM response */ }
  }
}
```

### File 3: `workflowEngine.js`
**What it does:** Rule-based fallback (used if GLM fails)

**Key function:** `detectConflictRuleBased(record)`

**What it checks:**
- Same equipment + different department
- Same location + different department  
- Same shift + different department

**Confidence:** 40% (lower than GLM's 70-90%)

---

## 🟢 Stage 1: Input Understanding

**GLM Task:** Parse unstructured input into structured fields

**Input:**
```
"Maintenance scheduled tomorrow but production needs the machine urgently"
```

**GLM Output:**
```json
{
  "title": "Machine maintenance",
  "equipment": "Machine",
  "departments": ["Maintenance", "Production"],
  "urgency": "high",
  "time": "tomorrow"
}
```

**Why GLM?** It understands natural language better than keyword matching

---

## 🟡 Stage 2: Conflict Detection

**GLM Task:** Use logical reasoning to detect conflicts

**GLM Questions:**
- Is same resource used by multiple departments? → YES
- Is there time overlap? → YES
- Is urgency conflicting? → YES

**GLM Output:**
```json
{
  "conflict": true,
  "conflict_type": "Resource Clash",
  "severity": "High",
  "conflicting_departments": ["Maintenance", "Production"],
  "resource_conflict": "Machine"
}
```

**Why GLM?** It can reason about conflicts, not just match keywords

---

## 🟠 Stage 3: Impact Analysis

**GLM Task:** Analyze root cause and business impact

**GLM Analysis:**
- Why did this happen? → Poor scheduling coordination
- What's the impact? → Production might be delayed
- What's the risk? → Revenue loss

**GLM Output:**
```json
{
  "impact_level": "Critical",
  "root_cause": "Overlapping schedules between departments",
  "business_impact": "Production delay, potential revenue loss",
  "risk_level": "Critical"
}
```

**Why GLM?** It can reason about consequences, not just detect conflicts

---

## 🔴 Stage 4: Decision & Recommendation

**GLM Task:** Evaluate options and make recommendation

**GLM Evaluates:**
- Option A: Delay maintenance (impact: low cost, high risk)
- Option B: Delay production (impact: high cost, low risk)
- Option C: Split schedule (impact: medium cost, low risk)

**GLM Chooses:** Option C (best trade-off)

**GLM Output:**
```json
{
  "recommendation": "Reschedule maintenance to afternoon",
  "action_type": "RESCHEDULE",
  "rationale": "Protects production, completes both tasks safely",
  "alternatives": ["Use backup machine", "Extend to overnight"],
  "escalation_needed": false,
  "confidence": 85
}
```

**Why GLM?** It can evaluate trade-offs and make informed decisions

---

## ⚠️ Fallback Tier (If GLM Fails)

If Z.AI is down or API key is missing:

**Rule-Based Detection:**
```javascript
function detectConflictRuleBased(record) {
  // Check if same equipment + different department
  // Check if same location + different department
  // Check if same shift + different department
  // Return true/false
}
```

**Returns same response structure as GLM but:**
- Confidence: 40% (vs 70-90% for GLM)
- Reasoning: "Rule-based detection (GLM unavailable)"
- Decision: Simple (Approve / Reschedule)

**Example Fallback Response:**
```json
{
  "success": true,
  "data": {
    "source": "rule-based-fallback",
    "warning": "GLM API unavailable",
    "input_understanding": { /* echo input */ },
    "conflict_analysis": {
      "conflict": true,
      "conflict_type": "Resource Clash",
      "severity": "Medium",
      "reasoning": "Rule-based detection (GLM unavailable)"
    },
    "impact_analysis": { /* basic */ },
    "decision": {
      "recommendation": "Reschedule to avoid conflict",
      "action_type": "RESCHEDULE",
      "confidence": 40
    }
  }
}
```

---

## 🎯 Complete Request → Response Flow

### 1. User Submits Form
```json
POST /api/submit-record
{
  "title": "CNC Machine Maintenance",
  "category": "Maintenance Request",
  "description": "Need to service CNC Machine A tomorrow morning, but Production has an urgent job scheduled for same time"
}
```

### 2. Controller Validates
```
✓ title present
✓ category present
✓ description present
```

### 3. Controller Calls GLM
```
callGLMWithZ("unifiedAgent", record)
↓
Z.AI API Endpoint
↓
GLM Processes 4 Stages
```

### 4. GLM Returns
```json
{
  "stage1_understanding": {
    "equipment": "CNC Machine A",
    "departments": ["Maintenance", "Production"],
    "urgency": "high"
  },
  "stage2_conflict_detection": {
    "conflict": true,
    "conflict_type": "Resource Clash"
  },
  "stage3_impact_analysis": {
    "root_cause": "Overlapping schedule",
    "impact": "Production delay"
  },
  "stage4_decision": {
    "recommendation": "Reschedule maintenance",
    "confidence": 85
  }
}
```

### 5. Controller Structures Response
```json
{
  "success": true,
  "data": {
    "executionId": "exec_1234567890",
    "source": "z-ai-glm",
    "processingTime": 2345,
    "input_understanding": { /* Stage 1 */ },
    "conflict_analysis": { /* Stage 2 */ },
    "impact_analysis": { /* Stage 3 */ },
    "decision": { /* Stage 4 */ }
  }
}
```

### 6. Response Sent to Frontend
Frontend displays:
- ✅ Conflict detected: YES
- ✅ Type: Resource Clash
- ✅ Severity: High
- ✅ Recommendation: Reschedule maintenance to afternoon
- ✅ Confidence: 85%

---

## 🚀 Quick Setup

### Step 1: Set API Key
```bash
export ZAI_API_KEY=sk_xxxxxxxxxxxxxxxxxxxx
```

### Step 2: Test
```bash
cd backend
node test-zai-integration.js
```

### Step 3: Start Server
```bash
npm start
```

### Step 4: Test Endpoint
```bash
curl -X POST http://localhost:5000/api/submit-record \
  -H "Content-Type: application/json" \
  -d '{
    "title": "CNC Machine Maintenance",
    "category": "Maintenance Request",
    "description": "Maintenance needed tomorrow but production needs machine urgently"
  }'
```

---

## 📊 Files in This System

| File | Lines | Purpose |
|---|---|---|
| `glmServices.js` | 300+ | Z.AI API client + 4-stage prompts |
| `aiController.js` | ~140 | HTTP endpoint + 2-tier orchestration |
| `workflowEngine.js` | ~100 | Rule-based fallback |
| `test-zai-integration.js` | ~200 | Test suite with 3 scenarios |

**Removed (Archived, not deleted):**
- ~~StateManager.js~~ - Not needed for hackathon
- ~~ConfidenceScorer.js~~ - Use GLM confidence directly
- ~~ExecutionTracer.js~~ - Use console.log for now
- ~~GLMDecisionController.js~~ - Replaced by simple aiController

---

## ✅ Compliance Checklist

### Requirement 1: GLM as Core Engine ✅
- [x] GLM is primary decision maker
- [x] Called in aiController.js
- [x] All reasoning goes through GLM

### Requirement 2: Structured Reasoning ✅
- [x] 4 stages (understanding, detection, analysis, decision)
- [x] JSON output, not text
- [x] Structured fields (conflict, severity, recommendation, confidence)

### Requirement 3: Real Workflow Automation ✅
- [x] Input → GLM → Decision → Action
- [x] Decisions: APPROVE, RESCHEDULE, ESCALATE
- [x] System actions on decisions

### Requirement 4: Backend API Integration ✅
- [x] `/api/submit-record` endpoint
- [x] Backend calls Z.AI GLM
- [x] Not frontend-only

### Requirement 5: Conflict Detection ✅
- [x] Compares with existing records (mock)
- [x] Detects same machine + time
- [x] Detects overlapping shifts
- [x] Detects resource conflicts
- [x] Returns CONFLICT_DETECTED action

### Requirement 6: Explainable Output ✅
- [x] All 4 stages visible in response
- [x] Clear reasoning per stage
- [x] Confidence score explains reliability
- [x] Rationale explains decision
- [x] Alternatives show options considered

---

## 🎉 Why This Works for Hackathons

1. **Simple to explain** - 2-tier system is easy to present
2. **Meets all requirements** - Each requirement clearly addressed
3. **Fast to deploy** - No complex state management
4. **Resilient** - Fallback ensures it always works
5. **Impressive** - GLM reasoning impresses judges
6. **Debuggable** - Easy to trace issues if problems occur

---

## 📞 If You Need to Extend

Future phases can add back:
- Persistent database for workflow history
- Learning loop from outcome feedback
- Advanced confidence scoring
- Workflow state tracking
- Multi-agent orchestration

But for **hackathon submission**, this 2-tier system is perfect.

---

**Status: ✅ SIMPLIFIED AND READY**

All complexity removed. All requirements met. Ready for judges!
