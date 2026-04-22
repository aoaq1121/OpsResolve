// services/StateManager.js
// Manages workflow lifecycle states and transitions

const WORKFLOW_STATES = {
  INITIAL: "INITIAL",           // Just received
  EXTRACTING: "EXTRACTING",     // Processing input
  ANALYZING: "ANALYZING",       // Detecting conflicts
  EVALUATING: "EVALUATING",     // Assessing impact
  DECIDING: "DECIDING",         // Making decision
  EXECUTING: "EXECUTING",       // Applying action
  COMPLETED: "COMPLETED",       // Success
  FAILED: "FAILED",             // Error
};

const VALID_TRANSITIONS = {
  [WORKFLOW_STATES.INITIAL]: [WORKFLOW_STATES.EXTRACTING],
  [WORKFLOW_STATES.EXTRACTING]: [WORKFLOW_STATES.ANALYZING, WORKFLOW_STATES.FAILED],
  [WORKFLOW_STATES.ANALYZING]: [WORKFLOW_STATES.EVALUATING, WORKFLOW_STATES.DECIDING, WORKFLOW_STATES.FAILED],
  [WORKFLOW_STATES.EVALUATING]: [WORKFLOW_STATES.DECIDING, WORKFLOW_STATES.FAILED],
  [WORKFLOW_STATES.DECIDING]: [WORKFLOW_STATES.EXECUTING, WORKFLOW_STATES.FAILED],
  [WORKFLOW_STATES.EXECUTING]: [WORKFLOW_STATES.COMPLETED, WORKFLOW_STATES.FAILED],
  [WORKFLOW_STATES.FAILED]: [],
  [WORKFLOW_STATES.COMPLETED]: [],
};

class StateManager {
  constructor(executionId) {
    this.executionId = executionId;
    this.state = WORKFLOW_STATES.INITIAL;
    this.startTime = Date.now();
    this.stateHistory = [
      {
        state: WORKFLOW_STATES.INITIAL,
        timestamp: Date.now(),
        metadata: {},
      },
    ];
    this.context = {}; // Store decision data throughout workflow
  }

  /**
   * Transition to a new state with validation
   */
  transitionTo(newState, metadata = {}) {
    const validNextStates = VALID_TRANSITIONS[this.state] || [];

    if (!validNextStates.includes(newState)) {
      throw new Error(
        `Invalid state transition: ${this.state} → ${newState}`
      );
    }

    const previousState = this.state;
    this.state = newState;
    const timestamp = Date.now();

    this.stateHistory.push({
      state: newState,
      previousState,
      timestamp,
      duration: timestamp - (this.stateHistory[this.stateHistory.length - 1]?.timestamp || this.startTime),
      metadata,
    });

    console.log(
      `[${this.executionId}] State: ${previousState} → ${newState} (${metadata.reason || ""})`
    );

    return { success: true, timestamp };
  }

  /**
   * Store data in workflow context
   */
  setContext(key, value) {
    this.context[key] = value;
  }

  /**
   * Retrieve workflow context
   */
  getContext(key) {
    return this.context[key];
  }

  /**
   * Get full execution summary
   */
  getSummary() {
    return {
      executionId: this.executionId,
      state: this.state,
      duration: Date.now() - this.startTime,
      stateHistory: this.stateHistory,
      context: this.context,
    };
  }

  /**
   * Check if workflow is in terminal state
   */
  isTerminal() {
    return (
      this.state === WORKFLOW_STATES.COMPLETED ||
      this.state === WORKFLOW_STATES.FAILED
    );
  }
}

module.exports = { StateManager, WORKFLOW_STATES };
