// services/workflowEngine.js

function normalizeSeverity(score) {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function decideAction(severity) {
  switch (severity) {
    case "High":
      return "ESCALATE";
    case "Medium":
      return "RESCHEDULE";
    case "Low":
    default:
      return "COORDINATE";
  }
}

function calculateConflictScore(newRecord, existingRecord) {
  let score = 0;

  if (!existingRecord) return score;

  if (
    newRecord.equipment &&
    existingRecord.equipment &&
    newRecord.equipment === existingRecord.equipment
  ) {
    score += 50;
  }

  if (
    newRecord.location &&
    existingRecord.location &&
    newRecord.location === existingRecord.location
  ) {
    score += 30;
  }

  if (
    newRecord.shift &&
    existingRecord.shift &&
    newRecord.shift === existingRecord.shift
  ) {
    score += 20;
  }

  if (newRecord.department !== existingRecord.department) {
    score += 10;
  }

  if (
    (newRecord.department === "Production" && existingRecord.department === "Maintenance") ||
    (newRecord.department === "Maintenance" && existingRecord.department === "Production")
  ) {
    score += 20;
  }

  if (newRecord.priority === "Critical") score += 20;
  if (newRecord.impact === "Full line stop") score += 30;

  return score;
}

/*
    processRecordWorkflow:
    1. Calculate conflict score
    2. Convert score to severity
    3. Decide action based on severity
    4. Return structured result
*/ 
function processRecordWorkflow(newRecord, existingRecord = null) {
  const score = calculateConflictScore(newRecord, existingRecord);
  const severity = normalizeSeverity(score);
  const actionType = decideAction(severity);

  return {
    conflict: !!existingRecord,
    score,
    severity,
    actionType,
    context: {
      existingRecordId: existingRecord?.recordId || null,
      reason: existingRecord ? "Resource or schedule overlap detected" : "No conflict detected",
    },
  };
}

module.exports = { processRecordWorkflow };

/*
  The workflow engine calculates a conflict score based on overlapping fields between the new record and an existing record. It then normalizes this score into a severity level (Low, Medium, High) and decides on an action (ESCALATE, RESCHEDULE, COORDINATE) accordingly. The result includes the conflict status, score, severity, action type, and contextual information about the matched record if a conflict exists.
  “We implemented a deterministic scoring engine to simulate baseline conflict detection, which ensures reliability and provides a fallback mechanism when AI reasoning is unavailable.” 
is this correct where the competition requirement want "The system should operate as a stateful and adaptive workflow engine, capable of handling
real-world constraints such as ambiguity, incomplete data, and process failures. If the GLM
component is removed, the system should lose its ability to coordinate and execute the
workflow effectively."
*/