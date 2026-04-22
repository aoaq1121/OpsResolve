// services/ExecutionTracer.js
// Logs decision points, GLM calls, and reasoning for audit trail

class ExecutionTracer {
  constructor(executionId) {
    this.executionId = executionId;
    this.traces = [];
    this.glmCalls = [];
  }

  /**
   * Log a decision point with full context
   */
  logDecision(decisionType, decision, confidence, metadata = {}) {
    const trace = {
      timestamp: Date.now(),
      executionId: this.executionId,
      type: "DECISION",
      decisionType, // "CONFLICT", "IMPACT", "ACTION", "ESCALATION"
      decision,
      confidence,
      metadata,
    };

    this.traces.push(trace);
    console.log(
      `[${this.executionId}] Decision: ${decisionType} | Confidence: ${confidence}% | Decision: ${JSON.stringify(decision)}`
    );

    return trace;
  }

  /**
   * Log a GLM API call with request/response
   */
  logGLMCall(agentType, prompt, response, duration, success = true) {
    const callLog = {
      timestamp: Date.now(),
      executionId: this.executionId,
      type: "GLM_CALL",
      agentType,
      promptLength: prompt?.length || 0,
      responseLength: JSON.stringify(response).length,
      duration, // ms
      success,
      response,
      error: success ? null : response?.error || "Unknown error",
    };

    this.glmCalls.push(callLog);

    const status = success ? "✓" : "✗";
    console.log(
      `[${this.executionId}] GLM Call ${status}: ${agentType} (${duration}ms)`
    );

    return callLog;
  }

  /**
   * Log a fallback trigger
   */
  logFallback(reason, agent, originalError = null) {
    const trace = {
      timestamp: Date.now(),
      executionId: this.executionId,
      type: "FALLBACK",
      reason,
      agent,
      error: originalError?.message || originalError,
    };

    this.traces.push(trace);
    console.warn(
      `[${this.executionId}] Fallback triggered: ${agent} - ${reason}`
    );

    return trace;
  }

  /**
   * Log a state transition
   */
  logStateTransition(fromState, toState, metadata = {}) {
    const trace = {
      timestamp: Date.now(),
      executionId: this.executionId,
      type: "STATE_TRANSITION",
      fromState,
      toState,
      metadata,
    };

    this.traces.push(trace);
    return trace;
  }

  /**
   * Log validation result
   */
  logValidation(validationType, passed, details = {}) {
    const trace = {
      timestamp: Date.now(),
      executionId: this.executionId,
      type: "VALIDATION",
      validationType,
      passed,
      details,
    };

    this.traces.push(trace);
    return trace;
  }

  /**
   * Generate execution report
   */
  getReport() {
    return {
      executionId: this.executionId,
      totalTraces: this.traces.length,
      totalGLMCalls: this.glmCalls.length,
      duration: this.traces.length > 0
        ? this.traces[this.traces.length - 1].timestamp - this.traces[0].timestamp
        : 0,
      glmSuccessRate:
        this.glmCalls.filter((c) => c.success).length / this.glmCalls.length || 0,
      fallbacks: this.traces.filter((t) => t.type === "FALLBACK").length,
      decisions: this.traces.filter((t) => t.type === "DECISION"),
      glmCalls: this.glmCalls,
      timeline: this.traces,
    };
  }

  /**
   * Export traces for logging/storage
   */
  export() {
    return {
      executionId: this.executionId,
      exportedAt: new Date().toISOString(),
      summary: this.getReport(),
      fullTrace: this.traces,
      glmCalls: this.glmCalls,
    };
  }
}

module.exports = { ExecutionTracer };
