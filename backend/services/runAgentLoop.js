// services/runAgentLoop.js

const { callGLM } = require("./glmService");
const { processRecordWorkflow } = require("./workflowEngine");

// Helper: check missing fields
function checkMissingFields(data) {
  const required = ["equipment", "location", "shift", "department"];
  return required.filter((field) => !data[field]);
}

async function runAgentLoop(newRecord, existingRecord) {
  try {

    // STEP 1: THINK → Extract structured info
    const extracted = await callGLM("inputAgent", newRecord);

    if (extracted.error) {
      console.warn("⚠️ Falling back to rule-based (input parsing failed)");
      return processRecordWorkflow(newRecord, existingRecord);
    }

    // STEP 2: THINK → Check missing info
    const missingFields = checkMissingFields(extracted);

    if (missingFields.length > 0) {
      return {
        status: "NEED_MORE_INFO",
        missing: missingFields,
        message: "Please provide missing details",
        partialData: extracted
      };
    }

    // Merge extracted with original (important)
    const enrichedRecord = {
      ...newRecord,
      ...extracted
    };

  
    // STEP 3: THINK → Conflict detection (AI)
    const conflictResult = await callGLM("conflictAgent", {
      newRecord: enrichedRecord,
      existingRecord
    });

    if (conflictResult.error) {
      console.warn("⚠️ Falling back to rule-based (conflict detection failed)");
      return processRecordWorkflow(enrichedRecord, existingRecord);
    }

    // If no conflict → early exit
    if (!conflictResult.conflict) {
      return {
        conflict: false,
        severity: "Low",
        actionType: "NONE",
        message: "No conflict detected"
      };
    }

    // ─────────────────────────────────────────────
    // STEP 4: THINK → Impact analysis
    // ─────────────────────────────────────────────
    const impactResult = await callGLM("impactAgent", {
      conflict: conflictResult,
      record: enrichedRecord
    });

    // fallback if AI fails
    if (impactResult.error) {
      console.warn("⚠️ Falling back to rule-based (impact failed)");
      return processRecordWorkflow(enrichedRecord, existingRecord);
    }

    // ─────────────────────────────────────────────
    // 🧠 STEP 5: THINK → Decision making
    // ─────────────────────────────────────────────
    const decisionResult = await callGLM("decisionAgent", {
      conflict: conflictResult,
      impact: impactResult,
      record: enrichedRecord
    });

    if (decisionResult.error) {
      console.warn("⚠️ Falling back to rule-based (decision failed)");
      return processRecordWorkflow(enrichedRecord, existingRecord);
    }

    // ─────────────────────────────────────────────
    // 🧠 FINAL OUTPUT (AI-driven)
    // ─────────────────────────────────────────────
    return {
      conflict: true,
      severity: conflictResult.severity || impactResult.impactLevel,
      actionType: decisionResult.actionType,
      aiSummary: {
        conflictReason: conflictResult.conflictReason,
        impact: impactResult,
        recommendation: decisionResult.recommendation,
        escalationNeeded: decisionResult.escalationNeeded
      },
      context: {
        existingRecordId: conflictResult.matchedRecordId || existingRecord?.recordId || null
      }
    };

  } catch (error) {
    console.error("❌ Agent Loop Error:", error);


    // FULL FALLBACK (very important for reliability)
    return processRecordWorkflow(newRecord, existingRecord);
  }
}

module.exports = { runAgentLoop };