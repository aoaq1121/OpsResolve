const { callGLM } = require("./glmServices");
const { processRecordWorkflow } = require("./workflowEngine");

function checkMissingFields(data) {
  const required = ["equipment", "location", "shift"];
  return required.filter((field) => !data[field]);
}

async function runAgentLoop(newRecord, existingRecord) {
  try {
    // Step 1: Parse and extract structured input
    const extracted = await callGLM("inputAgent", newRecord);

    if (extracted.error) {
      console.warn("Falling back to rule-based (input parsing failed)");
      return processRecordWorkflow(newRecord, existingRecord);
    }

    const missingFields = checkMissingFields(extracted);
    if (missingFields.length > 0) {
      return {
        status: "NEED_MORE_INFO",
        missing: missingFields,
        message: "Please provide missing details",
        partialData: extracted,
      };
    }

    const enrichedRecord = { ...newRecord, ...extracted };

    // Step 2: Detect conflict
    const conflictResult = await callGLM("conflictAgent", {
      newRecord: enrichedRecord,
      existingRecord,
    });

    if (conflictResult.error) {
      console.warn("Falling back to rule-based (conflict detection failed)");
      return processRecordWorkflow(enrichedRecord, existingRecord);
    }

    if (!conflictResult.conflict) {
      return {
        conflict: false,
        severity: "Low",
        actionType: "NONE",
        message: "No conflict detected",
      };
    }

    // Step 3: Analyse impact (run in parallel with step 4 prep)
    const impactResult = await callGLM("impactAgent", {
      conflict: conflictResult,
      record: enrichedRecord,
    });

    if (impactResult.error) {
      console.warn("Falling back to rule-based (impact failed)");
      return processRecordWorkflow(enrichedRecord, existingRecord);
    }

    // Step 4: Generate decision
    const decisionResult = await callGLM("decisionAgent", {
      conflict: conflictResult,
      impact: impactResult,
      record: enrichedRecord,
    });

    if (decisionResult.error) {
      console.warn("Falling back to rule-based (decision failed)");
      return processRecordWorkflow(enrichedRecord, existingRecord);
    }

    return {
      conflict: true,
      severity: conflictResult.severity || impactResult.impactLevel || "Medium",
      actionType: decisionResult.actionType || conflictResult.actionType || "ESCALATE",
      aiSummary: {
        conflictReason: conflictResult.conflictReason || "Conflict detected between departments",
        impact: impactResult,
        recommendation: decisionResult.recommendation || "Coordinate with affected departments",
        escalationNeeded: decisionResult.escalationNeeded || true,
      },
      context: {
        existingRecordId: conflictResult.matchedRecordId || existingRecord?.id || existingRecord?.recordId || null,
      },
    };
  } catch (error) {
    console.error("Agent loop error:", error.message);
    return processRecordWorkflow(newRecord, existingRecord);
  }
}

module.exports = { runAgentLoop };
