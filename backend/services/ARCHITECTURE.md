// Documentation: GLM-Driven Workflow Engine

/**
 * ARCHITECTURE OVERVIEW
 * 
 * The new GLM Decision Controller inverts the control flow:
 * 
 * OLD ARCHITECTURE (Request-Response):
 *   Input → Check Fields → Detect Conflict → Evaluate Impact → Make Decision → Return
 *   (GLM was called for each step independently, with fallback to rules)
 * 
 * NEW ARCHITECTURE (Orchestrated):
 *   Input → GLM ORCHESTRATES → State Transitions → Traces Recorded → Response
 *   (GLM controls the flow, decides which agents to call, validates results)
 * 
 * KEY INVERSION:
 * - GLM is no longer a "helper" that validates rule outputs
 * - GLM IS the decision maker; rules are the fallback
 * - System tracks confidence, state, and execution traces
 */

/**
 * CORE SERVICES
 * 
 * 1. StateManager (StateManager.js)
 *    Purpose: Track workflow lifecycle
 *    States: INITIAL → EXTRACTING → ANALYZING → EVALUATING → DECIDING → EXECUTING → COMPLETED/FAILED
 *    Features:
 *      - Validates state transitions (prevents invalid flows)
 *      - Stores context throughout workflow
 *      - Maintains audit trail of state changes
 *      - Tracks duration of each state
 * 
 * 2. ConfidenceScorer (ConfidenceScorer.js)
 *    Purpose: Score decision confidence with multiple factors
 *    Scoring Factors:
 *      - Data Completeness: % of required fields populated (0-100)
 *      - Rule Violations: Conflicts with hard constraints (0-100, inverted)
 *      - Consensus Score: Agreement between GLM and rule-based engine (0-100)
 *      - GLM Confidence: Explicit confidence from GLM response (0-100)
 *    Output:
 *      - Overall Score (weighted average of factors)
 *      - Uncertainty (100 - confidence)
 *      - Level (HIGH >= 80%, MEDIUM >= 60%, LOW < 60%)
 *      - Recommendation (PROCEED or ESCALATE_TO_HUMAN)
 * 
 * 3. ExecutionTracer (ExecutionTracer.js)
 *    Purpose: Log all decisions and GLM calls for audit trail
 *    Log Types:
 *      - DECISION: Decision point with confidence and reasoning
 *      - GLM_CALL: API call with duration, success status
 *      - FALLBACK: Trigger points when GLM fails
 *      - STATE_TRANSITION: State changes with metadata
 *      - VALIDATION: Data validation results
 *    Output:
 *      - Timeline of all events
 *      - Summary stats (success rate, fallback count)
 *      - Full export for persistence or debugging
 * 
 * 4. GLMDecisionController (GLMDecisionController.js)
 *    Purpose: Orchestrate the entire workflow with GLM as primary decision maker
 *    Flow:
 *      1. Initialize state manager and tracer
 *      2. Extract fields (GLM determines what to extract)
 *      3. Analyze conflicts (GLM determines conflict presence/severity)
 *      4. Evaluate impact (GLM determines operational impact)
 *      5. Make decision (GLM makes final action recommendation)
 *      6. Calculate confidence score
 *      7. Return full response with traces and state history
 *    Fallbacks:
 *      - If any GLM call fails, controller falls back to rule-based engine
 *      - Lower confidence scores indicate fallback usage
 *      - Full trace reveals where GLM failures occurred
 */

/**
 * RESPONSE STRUCTURE
 * 
 * Every response includes:
 * 
 * {
 *   executionId: "uuid",                      // Unique workflow ID
 *   conflict: boolean,                         // Conflict detected?
 *   severity: "High|Medium|Low",               // Severity level
 *   actionType: "ESCALATE|RESCHEDULE|COORDINATE|NONE",
 *   recommendation: string,                    // Human-readable recommendation
 *   escalationNeeded: boolean,                 // Should escalate?
 *   
 *   confidence: {                              // Confidence scoring details
 *     overallScore: 0-100,
 *     factors: {
 *       dataCompleteness: 0-100,
 *       ruleViolations: 0-100,
 *       consensusWithRules: 0-100,
 *       glmConfidence: 0-100
 *     },
 *     uncertainty: 0-100,                      // 100 - confidence
 *     level: "HIGH|MEDIUM|LOW",
 *     recommendation: "PROCEED|ESCALATE_TO_HUMAN"
 *   },
 *   
 *   aiSummary: {                               // What GLM decided
 *     conflictReason: string,
 *     impact: { ... },
 *     recommendation: string,
 *     escalationNeeded: boolean
 *   },
 *   
 *   trace: {                                   // Execution audit trail
 *     executionId: string,
 *     exportedAt: timestamp,
 *     summary: { ... },                        // Stats summary
 *     fullTrace: [ ... ],                      // All events
 *     glmCalls: [ ... ]                        // All GLM API calls
 *   },
 *   
 *   stateHistory: {                            // Workflow state changes
 *     executionId: string,
 *     state: current_state,
 *     duration: ms,
 *     stateHistory: [ ... ],                   // All state transitions
 *     context: { ... }                         // Workflow context data
 *   }
 * }
 */

/**
 * MIGRATION FROM OLD SYSTEM
 * 
 * OLD (runAgentLoop.js):
 *   - Calls agents sequentially (input, conflict, impact, decision)
 *   - Falls back to rules if GLM fails at any point
 *   - No state tracking, confidence scoring, or execution tracing
 *   - Response structure inconsistent
 * 
 * NEW (GLMDecisionController):
 *   - GLM orchestrates the entire workflow
 *   - Rules are fallback, not primary path
 *   - Every decision has confidence score
 *   - Full execution trace for debugging/learning
 *   - Structured response with trace and state history
 * 
 * DEPLOYMENT NOTES:
 *   1. Update aiController to use GLMDecisionController
 *   2. Keep runAgentLoop.js for now (backward compatibility)
 *   3. Monitor execution traces for patterns
 *   4. Collect confidence scores to calibrate thresholds
 *   5. Use execution traces to improve GLM prompts
 */

/**
 * CONFIDENCE THRESHOLDS & RECOMMENDATIONS
 * 
 * Score >= 80%: HIGH confidence
 *   → Proceed with action automatically
 *   → Minimal human review needed
 * 
 * Score 60-79%: MEDIUM confidence
 *   → Flag for review before proceeding
 *   → Investigate failure factors
 * 
 * Score < 60%: LOW confidence
 *   → Escalate to human decision maker
 *   → GLM likely failed or rules conflict heavily
 * 
 * Typical Low-Confidence Cases:
 *   - Missing critical data (incomplete records)
 *   - Hard constraint violations (critical + full stop)
 *   - GLM-Rules consensus disagreement
 *   - GLM JSON parsing failures
 */

/**
 * DEBUGGING WITH EXECUTION TRACES
 * 
 * Example trace analysis:
 * 
 *   1. Check executionId in response
 *   2. Review stateHistory for state transitions
 *      - Did system progress through expected states?
 *      - Were there unnecessary fallbacks?
 *   3. Review glmCalls in trace
 *      - How long were API calls?
 *      - Did GLM return valid JSON?
 *   4. Review decisions in trace
 *      - What confidence scores were assigned?
 *      - Why was confidence low?
 *   5. Check fallbacks in trace
 *      - Which agents triggered fallbacks?
 *      - What were the error messages?
 */

/**
 * NEXT PHASES (Future Work)
 * 
 * Phase 2: Persistence Layer
 *   - Database schema for workflows, decisions, outcomes
 *   - Store execution traces for historical analysis
 *   - Track success rates by decision type
 * 
 * Phase 3: Feedback Loop
 *   - API endpoint to collect decision outcomes
 *   - Track whether recommended action succeeded
 *   - Use historical data to improve GLM prompts
 *   - Adaptive learning: adjust confidence thresholds based on outcomes
 * 
 * Phase 4: Learning Metrics
 *   - Dashboard showing success rates
 *   - Identify patterns in low-confidence decisions
 *   - Monitor GLM vs rules performance
 *   - Continuous improvement cycle
 */

module.exports = {
  documentation: "GLM-Driven Workflow Engine Architecture",
};
