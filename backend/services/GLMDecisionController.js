// services/GLMDecisionController.js
// Makes GLM the PRIMARY decision orchestrator (not fallback)

const { callGLM } = require("./glmServices");
const { StateManager, WORKFLOW_STATES } = require("./StateManager");
const { ConfidenceScorer } = require("./ConfidenceScorer");
const { ExecutionTracer } = require("./ExecutionTracer");
const { processRecordWorkflow } = require("./workflowEngine");

// Simple ID generation (no external dependencies)
function generateExecutionId() {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

class GLMDecisionController {
  constructor() {
    this.executionId = generateExecutionId();
    this.stateManager = new StateManager(this.executionId);
    this.tracer = new ExecutionTracer(this.executionId);
  }

  /**
   * MAIN ORCHESTRATION METHOD
   * GLM decides the workflow steps, not the system
   */
  async orchestrateDecision(newRecord, existingRecord = null) {
    try {
      this.tracer.logStateTransition(
        WORKFLOW_STATES.INITIAL,
        WORKFLOW_STATES.EXTRACTING
      );
      this.stateManager.transitionTo(WORKFLOW_STATES.EXTRACTING, {
        reason: "GLM orchestration starting",
      });

      // ─────────────────────────────────────────────
      // STEP 1: Let GLM decide what to extract
      // ─────────────────────────────────────────────
      const extractionStart = Date.now();
      const extracted = await this._extractWithGLM(newRecord);
      const extractionDuration = Date.now() - extractionStart;

      this.tracer.logGLMCall(
        "inputAgent",
        "extract fields",
        extracted,
        extractionDuration,
        !extracted.error
      );

      if (extracted.error) {
        return this._handleExtractionFailure(newRecord, existingRecord);
      }

      const enrichedRecord = { ...newRecord, ...extracted };
      this.stateManager.setContext("enrichedRecord", enrichedRecord);

      // ─────────────────────────────────────────────
      // STEP 2: GLM orchestrates conflict analysis
      // ─────────────────────────────────────────────
      this.stateManager.transitionTo(WORKFLOW_STATES.ANALYZING, {
        reason: "GLM analyzing conflicts",
      });

      const analysisStart = Date.now();
      const conflictResult = await this._analyzeWithGLM(enrichedRecord, existingRecord);
      const analysisDuration = Date.now() - analysisStart;

      this.tracer.logGLMCall(
        "conflictAgent",
        "analyze conflicts",
        conflictResult,
        analysisDuration,
        !conflictResult.error
      );

      if (conflictResult.error) {
        return this._handleAnalysisFailure(enrichedRecord, existingRecord);
      }

      this.stateManager.setContext("conflictResult", conflictResult);

      // Early exit if no conflict
      if (!conflictResult.conflict) {
        this.stateManager.transitionTo(WORKFLOW_STATES.COMPLETED, {
          reason: "No conflict detected",
        });

        return {
          executionId: this.executionId,
          conflict: false,
          severity: "Low",
          actionType: "NONE",
          message: "No conflict detected",
          trace: this.tracer.export(),
          stateHistory: this.stateManager.getSummary(),
        };
      }

      // ─────────────────────────────────────────────
      // STEP 3: GLM orchestrates impact evaluation
      // ─────────────────────────────────────────────
      this.stateManager.transitionTo(WORKFLOW_STATES.EVALUATING, {
        reason: "GLM evaluating impact",
      });

      const impactStart = Date.now();
      const impactResult = await this._evaluateWithGLM(
        enrichedRecord,
        conflictResult,
        existingRecord
      );
      const impactDuration = Date.now() - impactStart;

      this.tracer.logGLMCall(
        "impactAgent",
        "evaluate impact",
        impactResult,
        impactDuration,
        !impactResult.error
      );

      if (impactResult.error) {
        return this._handleImpactFailure(enrichedRecord, existingRecord);
      }

      this.stateManager.setContext("impactResult", impactResult);

      // ─────────────────────────────────────────────
      // STEP 4: GLM makes the FINAL DECISION
      // ─────────────────────────────────────────────
      this.stateManager.transitionTo(WORKFLOW_STATES.DECIDING, {
        reason: "GLM making final decision",
      });

      const decisionStart = Date.now();
      const decisionResult = await this._makeDecisionWithGLM(
        enrichedRecord,
        conflictResult,
        impactResult
      );
      const decisionDuration = Date.now() - decisionStart;

      this.tracer.logGLMCall(
        "decisionAgent",
        "make decision",
        decisionResult,
        decisionDuration,
        !decisionResult.error
      );

      if (decisionResult.error) {
        return this._handleDecisionFailure(enrichedRecord, existingRecord);
      }

      // ─────────────────────────────────────────────
      // STEP 5: Calculate confidence and generate response
      // ─────────────────────────────────────────────
      const rulesBaseline = processRecordWorkflow(enrichedRecord, existingRecord);

      const confidence = ConfidenceScorer.generateReport(
        enrichedRecord,
        existingRecord,
        decisionResult,
        rulesBaseline
      );

      this.tracer.logDecision("FINAL_DECISION", decisionResult, confidence.overallScore, {
        impactLevel: impactResult.impactLevel,
      });

      this.stateManager.setContext("confidence", confidence);
      this.stateManager.setContext("decision", decisionResult);
      this.stateManager.transitionTo(WORKFLOW_STATES.EXECUTING, {
        reason: "Decision ready for execution",
      });

      // ─────────────────────────────────────────────
      // FINAL RESPONSE
      // ─────────────────────────────────────────────
      const response = {
        executionId: this.executionId,
        conflict: true,
        severity: decisionResult.severity || impactResult.impactLevel,
        actionType: decisionResult.actionType,
        recommendation: decisionResult.recommendation,
        escalationNeeded: decisionResult.escalationNeeded,
        confidence,
        aiSummary: {
          conflictReason: conflictResult.conflictReason,
          impact: impactResult,
          recommendation: decisionResult.recommendation,
          escalationNeeded: decisionResult.escalationNeeded,
        },
        context: {
          existingRecordId:
            conflictResult.matchedRecordId || existingRecord?.recordId || null,
        },
        trace: this.tracer.export(),
        stateHistory: this.stateManager.getSummary(),
      };

      this.stateManager.transitionTo(WORKFLOW_STATES.COMPLETED, {
        reason: "Decision executed successfully",
      });

      return response;
    } catch (error) {
      console.error(`[${this.executionId}] Critical error:`, error);
      this.tracer.logFallback("CRITICAL_ERROR", "orchestration", error);
      this.stateManager.transitionTo(WORKFLOW_STATES.FAILED, {
        reason: error.message,
      });

      return this._criticalFallback(newRecord, existingRecord, error);
    }
  }

  // ─────────────────────────────────────────────
  // PRIVATE HELPER METHODS
  // ─────────────────────────────────────────────

  async _extractWithGLM(record) {
    return await callGLM("inputAgent", record);
  }

  async _analyzeWithGLM(enrichedRecord, existingRecord) {
    return await callGLM("conflictAgent", {
      newRecord: enrichedRecord,
      existingRecord,
    });
  }

  async _evaluateWithGLM(enrichedRecord, conflictResult, existingRecord) {
    return await callGLM("impactAgent", {
      conflict: conflictResult,
      record: enrichedRecord,
      existingRecord,
    });
  }

  async _makeDecisionWithGLM(enrichedRecord, conflictResult, impactResult) {
    return await callGLM("decisionAgent", {
      conflict: conflictResult,
      impact: impactResult,
      record: enrichedRecord,
    });
  }

  _handleExtractionFailure(newRecord, existingRecord) {
    this.tracer.logFallback("EXTRACTION_FAILED", "inputAgent");
    this.stateManager.transitionTo(WORKFLOW_STATES.ANALYZING, {
      reason: "Fallback to rule-based extraction",
    });

    const rulesResult = processRecordWorkflow(newRecord, existingRecord);
    return {
      executionId: this.executionId,
      ...rulesResult,
      message: "Using rule-based processing (GLM extraction failed)",
      trace: this.tracer.export(),
      confidence: {
        overallScore: 40,
        level: "LOW",
        recommendation: "ESCALATE_TO_HUMAN",
      },
    };
  }

  _handleAnalysisFailure(enrichedRecord, existingRecord) {
    this.tracer.logFallback("ANALYSIS_FAILED", "conflictAgent");
    this.stateManager.transitionTo(WORKFLOW_STATES.ANALYZING, {
      reason: "Fallback to rule-based analysis",
    });

    const rulesResult = processRecordWorkflow(enrichedRecord, existingRecord);
    return {
      executionId: this.executionId,
      ...rulesResult,
      message: "Using rule-based processing (GLM analysis failed)",
      trace: this.tracer.export(),
      confidence: {
        overallScore: 45,
        level: "LOW",
        recommendation: "ESCALATE_TO_HUMAN",
      },
    };
  }

  _handleImpactFailure(enrichedRecord, existingRecord) {
    this.tracer.logFallback("IMPACT_FAILED", "impactAgent");
    this.stateManager.transitionTo(WORKFLOW_STATES.EVALUATING, {
      reason: "Fallback to rule-based impact",
    });

    const rulesResult = processRecordWorkflow(enrichedRecord, existingRecord);
    return {
      executionId: this.executionId,
      ...rulesResult,
      message: "Using rule-based processing (GLM impact failed)",
      trace: this.tracer.export(),
      confidence: {
        overallScore: 50,
        level: "MEDIUM",
        recommendation: "REVIEW_RECOMMENDED",
      },
    };
  }

  _handleDecisionFailure(enrichedRecord, existingRecord) {
    this.tracer.logFallback("DECISION_FAILED", "decisionAgent");
    this.stateManager.transitionTo(WORKFLOW_STATES.DECIDING, {
      reason: "Fallback to rule-based decision",
    });

    const rulesResult = processRecordWorkflow(enrichedRecord, existingRecord);
    return {
      executionId: this.executionId,
      ...rulesResult,
      message: "Using rule-based processing (GLM decision failed)",
      trace: this.tracer.export(),
      confidence: {
        overallScore: 55,
        level: "MEDIUM",
        recommendation: "REVIEW_RECOMMENDED",
      },
    };
  }

  _criticalFallback(newRecord, existingRecord, error) {
    const rulesResult = processRecordWorkflow(newRecord, existingRecord);
    return {
      executionId: this.executionId,
      ...rulesResult,
      message: `Critical failure - using rule-based fallback: ${error.message}`,
      trace: this.tracer.export(),
      confidence: {
        overallScore: 30,
        level: "LOW",
        recommendation: "ESCALATE_TO_HUMAN",
      },
    };
  }
}

module.exports = { GLMDecisionController };
