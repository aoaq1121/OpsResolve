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