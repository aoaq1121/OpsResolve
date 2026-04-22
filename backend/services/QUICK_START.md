// QUICK START GUIDE
// GLM-Driven Workflow Engine Implementation

/*

╔════════════════════════════════════════════════════════════════════════════╗
║                         IMPLEMENTATION COMPLETE                            ║
║                                                                            ║
║           ✅ StateManager - Workflow state tracking                       ║
║           ✅ ConfidenceScorer - Multi-factor confidence scoring           ║
║           ✅ ExecutionTracer - Audit trail and event logging              ║
║           ✅ GLMDecisionController - Primary orchestrator                 ║
║           ✅ Updated aiController - Integration complete                  ║
║                                                                            ║
║  Status: Ready for testing with GLM API                                  ║
╚════════════════════════════════════════════════════════════════════════════╝


1. ARCHITECTURE OVERVIEW
═════════════════════════════════════════════════════════════════════════════

The new system INVERTS control flow:

  OLD (Fallback Model):
  Input → Rules Check → [GLM validates] → Return
  
  NEW (Orchestration Model):
  Input → [GLM ORCHESTRATES] → Rules are fallback → Return


2. FILE STRUCTURE
═════════════════════════════════════════════════════════════════════════════

backend/services/
├── StateManager.js
│   └─ Manages workflow lifecycle (INITIAL → EXTRACTING → ... → COMPLETED)
│   └─ Tracks state transitions with validation
│   └─ Stores execution context throughout workflow
│
├── ConfidenceScorer.js
│   └─ Scores decisions with 4 weighted factors
│   └─ Completeness (25%), Violations (25%), Consensus (25%), GLM (25%)
│   └─ Output: Overall score, factors, level (HIGH/MEDIUM/LOW)
│
├── ExecutionTracer.js
│   └─ Logs all decisions and GLM calls
│   └─ Event types: DECISION, GLM_CALL, FALLBACK, STATE_TRANSITION, VALIDATION
│   └─ Exports full timeline for debugging/compliance
│
├── GLMDecisionController.js ⭐ NEW PRIMARY ORCHESTRATOR
│   └─ Main entry point for workflow orchestration
│   └─ Calls: extract → analyze → evaluate → decide
│   └─ Returns response with traces and confidence
│
├── workflowEngine.js (existing)
│   └─ Rule-based fallback engine
│   └─ Used when GLM calls fail
│
├── glmServices.js (existing)
│   └─ Low-level GLM API client
│   └─ Handles JSON parsing and error handling
│
├── aiController.js (UPDATED)
│   └─ HTTP endpoint handler
│   └─ Now uses GLMDecisionController instead of runAgentLoop
│
├── ARCHITECTURE.md
│   └─ Detailed architecture documentation
│
├── ARCHITECTURE_DIAGRAM.md
│   └─ Visual diagrams and state machines
│
└── (runAgentLoop.js - kept for backward compatibility)


3. INTEGRATION CHECKLIST
═════════════════════════════════════════════════════════════════════════════

✅ Step 1: Files Created
   • StateManager.js ............... ✓
   • ConfidenceScorer.js ........... ✓
   • ExecutionTracer.js ............ ✓
   • GLMDecisionController.js ...... ✓
   • Documentation files ........... ✓

✅ Step 2: Updated Existing Files
   • aiController.js .............. ✓ (now uses GLMDecisionController)
   • No breaking changes to API contract

✅ Step 3: Dependencies
   • No external dependencies added
   • Uses only built-in Node.js features
   • Removed uuid dependency (custom ID generation)

✅ Step 4: Ready for Testing
   • Structure is complete
   • Ready to test with actual GLM API calls
   • Monitor execution traces for patterns


4. TESTING THE SYSTEM
═════════════════════════════════════════════════════════════════════════════

Example Request:
POST /api/submit-record
{
  "title": "Machine M-07 service request",
  "category": "Maintenance Request",
  "location": "Line A",
  "equipment": "Machine M-07",
  "priority": "High",
  "shift": "Morning",
  "date": "2024-04-23",
  "duration": "2–4 hours",
  "impact": "Minor disruption",
  "description": "Preventive maintenance for machine M-07..."
}

Example Response:
{
  "success": true,
  "data": {
    "executionId": "exec_1234567890_abc123def",
    "conflict": true,
    "severity": "Medium",
    "actionType": "RESCHEDULE",
    "recommendation": "Reschedule M-07 maintenance to avoid production peak...",
    "escalationNeeded": false,
    
    "confidence": {
      "overallScore": 78,
      "factors": {
        "dataCompleteness": 90,
        "ruleViolations": 65,
        "consensusWithRules": 85,
        "glmConfidence": 75
      },
      "uncertainty": 22,
      "level": "MEDIUM",
      "recommendation": "REVIEW_RECOMMENDED"
    },
    
    "trace": {
      "executionId": "exec_1234567890_abc123def",
      "exportedAt": "2024-04-22T11:00:00Z",
      "summary": {
        "totalTraces": 12,
        "totalGLMCalls": 4,
        "duration": 543,
        "glmSuccessRate": 1.0,
        "fallbacks": 0
      },
      "fullTrace": [
        { type: "STATE_TRANSITION", fromState: "INITIAL", toState: "EXTRACTING", ... },
        { type: "GLM_CALL", agentType: "inputAgent", success: true, duration: 120, ... },
        { type: "STATE_TRANSITION", fromState: "EXTRACTING", toState: "ANALYZING", ... },
        { type: "GLM_CALL", agentType: "conflictAgent", success: true, duration: 105, ... },
        { type: "DECISION", decisionType: "CONFLICT", confidence: 90, ... },
        // ... more events ...
      ],
      "glmCalls": [ ... ]
    },
    
    "stateHistory": {
      "executionId": "exec_1234567890_abc123def",
      "state": "COMPLETED",
      "duration": 543,
      "stateHistory": [
        { state: "INITIAL", timestamp: 1234567890, duration: 0, ... },
        { state: "EXTRACTING", timestamp: 1234567891, duration: 1, ... },
        { state: "ANALYZING", timestamp: 1234567892, duration: 120, ... },
        // ... state transitions ...
      ],
      "context": {
        "enrichedRecord": { ... },
        "conflictResult": { ... },
        "impactResult": { ... },
        "decision": { ... }
      }
    }
  }
}


5. CONFIDENCE THRESHOLDS
═════════════════════════════════════════════════════════════════════════════

HIGH (≥ 80%)
  → System is highly confident in the decision
  → Proceed automatically
  → Minimal human review needed
  → Data complete, no rule violations, GLM and rules agree

MEDIUM (60-79%)
  → System has moderate confidence
  → Flag for human review before execution
  → Investigate failing factors
  → Some missing data or minor rule violations

LOW (< 60%)
  → System has low confidence
  → Escalate to human decision maker
  → GLM likely failed or rules conflict heavily
  → Critical data missing or hard constraint violation


6. DEBUGGING & ANALYSIS
═════════════════════════════════════════════════════════════════════════════

To debug a low-confidence decision:

1. Check executionId
   → Identifies the specific workflow instance

2. Review stateHistory
   → Did workflow progress through expected states?
   → Were there unexpected state transitions?
   → How long did each state take?

3. Review glmCalls
   → Which GLM calls succeeded/failed?
   → How long were API calls?
   → Did GLM return valid JSON?

4. Check confidence factors
   → Which factor(s) lowered the score?
   → dataCompleteness too low? → Request missing fields
   → ruleViolations high? → Investigate constraint conflicts
   → consensusWithRules low? → GLM disagrees with rules
   → glmConfidence low? → GLM was uncertain

5. Look for fallbacks
   → Filter trace for type="FALLBACK"
   → Where did GLM fail?
   → What was the error?


7. NEXT PHASES
═════════════════════════════════════════════════════════════════════════════

Phase 2: Persistence Layer
  □ Store execution traces in database
  □ Query interface for historical analysis
  □ Audit trail for compliance

Phase 3: Feedback Loop
  □ Outcome collection API (did action succeed?)
  □ Track success rates by decision type
  □ Learn from past decisions

Phase 4: Learning & Optimization
  □ Identify patterns in low-confidence decisions
  □ Adjust confidence thresholds based on outcomes
  □ Improve GLM prompts iteratively
  □ Dashboard showing metrics over time


8. KEY IMPROVEMENTS OVER PREVIOUS SYSTEM
═════════════════════════════════════════════════════════════════════════════

❌ OLD: No state tracking
✅ NEW: Full state lifecycle with transitions

❌ OLD: No confidence scoring
✅ NEW: Multi-factor confidence (completeness, violations, consensus, GLM)

❌ OLD: Limited execution visibility
✅ NEW: Complete audit trail (every decision, every GLM call)

❌ OLD: GLM was fallback
✅ NEW: GLM is PRIMARY orchestrator, rules are fallback

❌ OLD: No uncertainty tracking
✅ NEW: Uncertainty score and confidence level

❌ OLD: Hard to debug failures
✅ NEW: Detailed execution traces for post-mortem analysis

❌ OLD: No learning capability
✅ NEW: Foundation for adaptive learning (Phase 3+)


9. ARCHITECTURE PRINCIPLES
═════════════════════════════════════════════════════════════════════════════

✓ SINGLE RESPONSIBILITY
  Each service has one clear purpose

✓ SEPARATION OF CONCERNS
  State, confidence, tracing, orchestration are decoupled

✓ OBSERVABILITY
  Every decision is logged and traceable

✓ GRACEFUL DEGRADATION
  System remains operational if GLM fails

✓ CONFIDENCE-DRIVEN ESCALATION
  Low-confidence decisions escalated to humans

✓ AUDIT TRAIL
  Complete record for compliance and learning


10. QUICK REFERENCE
═════════════════════════════════════════════════════════════════════════════

To integrate into your codebase:
  
  1. Place the 4 service files in backend/services/
  2. Update aiController to use GLMDecisionController
  3. Test with sample requests
  4. Monitor execution traces
  5. Calibrate confidence thresholds based on real data

Service Imports:
  const { StateManager } = require('./StateManager');
  const { ConfidenceScorer } = require('./ConfidenceScorer');
  const { ExecutionTracer } = require('./ExecutionTracer');
  const { GLMDecisionController } = require('./GLMDecisionController');

Main Entry Point:
  const controller = new GLMDecisionController();
  const result = await controller.orchestrateDecision(record, existingRecord);

Result Properties:
  • executionId: Unique workflow ID
  • conflict: Whether conflict detected
  • severity: High/Medium/Low
  • actionType: ESCALATE/RESCHEDULE/COORDINATE/NONE
  • confidence: { overallScore, factors, level, recommendation }
  • trace: Full execution audit trail
  • stateHistory: State transitions and context


═════════════════════════════════════════════════════════════════════════════
Status: ✅ IMPLEMENTATION COMPLETE
Next: Test with GLM API and calibrate thresholds
═════════════════════════════════════════════════════════════════════════════

*/

module.exports = {
  quickStart: "GLM-Driven Workflow Engine Quick Start Guide",
};
