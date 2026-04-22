// WORKFLOW ARCHITECTURE DIAGRAM
// GLM-Driven Decision Controller

/*

╔════════════════════════════════════════════════════════════════════════════╗
║                    GLM DECISION CONTROLLER ARCHITECTURE                    ║
╚════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                              INPUT REQUEST                                   │
│                         (New operational record)                             │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GLMDecisionController.orchestrateDecision()              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Initialize:                                                         │  │
│  │  • executionId (unique workflow ID)                                 │  │
│  │  • StateManager (tracks state transitions)                          │  │
│  │  • ExecutionTracer (logs all events)                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
   ┌─────────┐             ┌──────────┐          ┌──────────────┐
   │ STATE:  │             │ StateManager.       │  ExecutionTracer.
   │ INITIAL │             │ transitionTo()      │  logStateTransition()
   │         │             │ EXTRACTING          │
   └─────────┘             └──────────┘          └──────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: EXTRACT FIELDS                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  callGLM("inputAgent", record)                                      │  │
│  │  → GLM determines which fields to extract/normalize                 │  │
│  │  → Sets enrichedRecord context                                      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ExecutionTracer.logGLMCall("inputAgent", prompt, response, duration)      │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
   ┌─────────┐             ┌──────────┐          ┌──────────────┐
   │ STATE:  │             │ StateManager.       │  ExecutionTracer.
   │ EXTRACT │             │ transitionTo()      │  logGLMCall()
   │ ▼       │             │ ANALYZING           │
   │ANALYZING│             └──────────┘          └──────────────┘
   └─────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: ANALYZE CONFLICTS                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  callGLM("conflictAgent", {newRecord, existingRecord})              │  │
│  │  → GLM determines if conflict exists                               │  │
│  │  → GLM scores severity (Low/Medium/High)                           │  │
│  │  → Sets conflictResult context                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  IF conflictResult.conflict === false:                                     │
│    → Return early with "No conflict" response                              │
│    → Skip impact and decision steps                                        │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
   ┌─────────┐             ┌──────────┐          ┌──────────────┐
   │ STATE:  │             │ StateManager.       │  ExecutionTracer.
   │ANALYZING│             │ transitionTo()      │  logGLMCall()
   │ ▼       │             │ EVALUATING          │  logDecision()
   │EVALUATIN│             └──────────┘          └──────────────┘
   │   G     │
   └─────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: EVALUATE IMPACT                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  callGLM("impactAgent", {conflict, record, existingRecord})         │  │
│  │  → GLM analyzes operational impact                                  │  │
│  │  → GLM assesses risk level                                         │  │
│  │  → Sets impactResult context                                       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
   ┌─────────┐             ┌──────────┐          ┌──────────────┐
   │ STATE:  │             │ StateManager.       │  ExecutionTracer.
   │EVALUATIN│             │ transitionTo()      │  logGLMCall()
   │    G    │             │ DECIDING            │
   │ ▼       │             └──────────┘          └──────────────┘
   │DECIDING │
   └─────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: MAKE DECISION                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  callGLM("decisionAgent", {conflict, impact, record})               │  │
│  │  → GLM recommends action (ESCALATE/RESCHEDULE/COORDINATE)          │  │
│  │  → GLM suggests escalation need                                    │  │
│  │  → Sets decision context                                           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
   ┌─────────┐             ┌──────────┐          ┌──────────────────┐
   │ STATE:  │             │ CONFIDENCE      │  ExecutionTracer.
   │DECIDING │             │ SCORER:         │  logDecision()
   │ ▼       │             │ Multi-Factor    │
   │EXECUTING│             │ Scoring:        │  ConfidenceScorer.
   └─────────┘             │ • Completeness  │  generateReport()
                           │ • Violations    │
                           │ • Consensus     │
                           │ • GLM conf      │
                           └──────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
   ┌──────────┐           ┌─────────────┐        ┌──────────────┐
   │ STATE:   │           │ RESPONSE    │        │ ExecutionTracer.
   │EXECUTING │           │ ASSEMBLY:   │        │ export()
   │ ▼        │           │ • Status    │        │
   │COMPLETED │           │ • Severity  │        └──────────────┘
   └──────────┘           │ • Decision  │
                          │ • Trace     │
                          │ • Confidence│
                          │ • History   │
                          └─────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OUTPUT RESPONSE                                   │
│  {                                                                           │
│    executionId: "exec_...",                                                │
│    conflict: true/false,                                                    │
│    severity: "High|Medium|Low",                                            │
│    actionType: "ESCALATE|RESCHEDULE|COORDINATE|NONE",                     │
│    confidence: { overallScore, factors, level, recommendation },           │
│    trace: { executionId, summary, fullTrace, glmCalls },                   │
│    stateHistory: { state, stateHistory, context }                          │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘


╔════════════════════════════════════════════════════════════════════════════╗
║                        CONFIDENCE SCORING FORMULA                          ║
╚════════════════════════════════════════════════════════════════════════════╝

  Completeness Score (0-100)
  └─ % of required fields populated


  Rule Violations Score (0-100)
  └─ Sum of hard constraint conflicts
  └─ Inverted: 100 - violations


  Consensus Score (0-100)
  └─ Agreement between GLM decision and rule-based engine
  └─ Match on: conflict, severity, actionType


  GLM Confidence (0-100)
  └─ Explicit confidence from GLM response


  OVERALL SCORE = (25% × Completeness) + (25% × RuleViolations)
                + (25% × Consensus) + (25% × GLMConfidence)


  Confidence Level:
  • HIGH:    >= 80%    → Proceed automatically
  • MEDIUM:  60-79%    → Flag for review
  • LOW:     < 60%     → Escalate to human


╔════════════════════════════════════════════════════════════════════════════╗
║                         STATE TRANSITION DIAGRAM                           ║
╚════════════════════════════════════════════════════════════════════════════╝

                         ┌───────────┐
                         │ INITIAL   │
                         └─────┬─────┘
                               │
                               ▼
                         ┌───────────┐
                         │EXTRACTING │
                         └─────┬─────┘
                               │
                      ┌────────┴────────┐
                      │                 │
                      ▼                 ▼
                  ┌────────┐      ┌────────┐
                  │FAILED  │      │ANALYZING│
                  └────────┘      └────┬────┘
                                       │
                            ┌──────────┴──────────┐
                            │                     │
                            ▼                     ▼
                        ┌────────┐          ┌──────────┐
                        │FAILED  │          │EVALUATING│
                        └────────┘          └────┬─────┘
                                                 │
                                   ┌─────────────┴─────────────┐
                                   │                           │
                                   ▼                           ▼
                               ┌────────┐                ┌──────────┐
                               │FAILED  │                │DECIDING  │
                               └────────┘                └────┬─────┘
                                                              │
                                            ┌─────────────────┴─────────────┐
                                            │                               │
                                            ▼                               ▼
                                        ┌────────┐                   ┌──────────┐
                                        │FAILED  │                   │EXECUTING │
                                        └────────┘                   └────┬─────┘
                                                                          │
                                            ┌─────────────────────────────┴───┐
                                            │                               │
                                            ▼                               ▼
                                        ┌────────┐                   ┌──────────┐
                                        │COMPLETED│                  │FAILED    │
                                        └────────┘                   └──────────┘


FALLBACK BEHAVIOR:
  If any step (EXTRACTING, ANALYZING, EVALUATING, DECIDING) fails:
    → Transition to FAILED state
    → Call processRecordWorkflow() as fallback
    → Return response with lower confidence score
    → Log fallback in execution trace

*/

module.exports = {
  diagram: "GLM Decision Controller Architecture",
};
