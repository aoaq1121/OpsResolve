const { callGLM } = require("./glmServices");
const { processRecordWorkflow } = require("./workflowEngine");

function checkMissingFields(data) {
  const required = ["equipment", "location", "shift"];
  return required.filter((field) => !data[field]);
}

// Generate specific recommendations when AI fails
function generateSpecificRecommendation(newRecord, existingRecord, conflictScore) {
  const deptA = newRecord.department || "Department A";
  const deptB = existingRecord?.department || "Department B";
  const equipment = newRecord.equipment || existingRecord?.equipment || "shared resource";
  const shift = newRecord.shift || existingRecord?.shift || "current shift";
  
  if (conflictScore >= 70) {
    return {
      recommendation: `${deptA} and ${deptB} have a HIGH severity conflict over ${equipment} on ${shift}. Immediate escalation required. ${deptA} should pause operations. ${deptB} should provide alternative plan within 2 hours.`,
      deptA_action: `Stop using ${equipment} and document requirements`,
      deptB_action: `Find alternative ${equipment} or reschedule`,
      timeline: "Escalate to Operations Manager immediately",
      escalationNeeded: true
    };
  } else if (conflictScore >= 40) {
    return {
      recommendation: `${deptA} and ${deptB} conflict over ${equipment} on ${shift}. Schedule coordination meeting within 24 hours. Consider splitting shifts: ${deptA} morning, ${deptB} afternoon.`,
      deptA_action: `Provide availability for alternative shift`,
      deptB_action: `Propose modified schedule`,
      timeline: "Resolve within 24 hours",
      escalationNeeded: false
    };
  } else {
    return {
      recommendation: `${deptA} and ${deptB} have minor overlap. Simple coordination needed. ${deptA} should notify ${deptB} of any changes.`,
      deptA_action: `Share updated schedule with ${deptB}`,
      deptB_action: `Acknowledge receipt within 4 hours`,
      timeline: "Same day resolution",
      escalationNeeded: false
    };
  }
}

async function runAgentLoop(newRecord, existingRecord) {
  try {
    console.log("🤖 Running AI agent loop...");
    
    // Step 1: Parse and extract structured input
    const extracted = await callGLM("inputAgent", newRecord);
    console.log("📝 Input parsed:", extracted);

    if (extracted.error) {
      console.warn("⚠️ Falling back to rule-based (input parsing failed)");
      const fallback = processRecordWorkflow(newRecord, existingRecord);
      const specificRec = generateSpecificRecommendation(newRecord, existingRecord, fallback.score);
      return {
        conflict: fallback.conflict,
        severity: fallback.severity,
        actionType: fallback.actionType,
        aiSummary: {
          conflictReason: specificRec.recommendation,
          recommendation: specificRec.recommendation,
          deptA_action: specificRec.deptA_action,
          deptB_action: specificRec.deptB_action,
          timeline: specificRec.timeline,
          escalationNeeded: specificRec.escalationNeeded
        },
        context: fallback.context
      };
    }

    const missingFields = checkMissingFields(extracted);
    if (missingFields.length > 0) {
      return {
        status: "NEED_MORE_INFO",
        missing: missingFields,
        message: `Please provide: ${missingFields.join(", ")}`,
        partialData: extracted,
      };
    }

    const enrichedRecord = { ...newRecord, ...extracted };

    // Step 2: Detect conflict
    const conflictResult = await callGLM("conflictAgent", {
      newRecord: enrichedRecord,
      existingRecord,
    });
    console.log("⚡ Conflict detection:", conflictResult);

    if (conflictResult.error || !conflictResult.conflict) {
      if (!conflictResult.conflict) {
        return {
          conflict: false,
          severity: "Low",
          actionType: "NONE",
          message: "No conflict detected",
          aiSummary: {
            recommendation: "No action needed. Proceed with normal operations."
          }
        };
      }
      console.warn("⚠️ Falling back to rule-based (conflict detection failed)");
      const fallback = processRecordWorkflow(enrichedRecord, existingRecord);
      const specificRec = generateSpecificRecommendation(enrichedRecord, existingRecord, fallback.score);
      return {
        conflict: fallback.conflict,
        severity: fallback.severity,
        actionType: fallback.actionType,
        aiSummary: {
          conflictReason: specificRec.recommendation,
          recommendation: specificRec.recommendation,
          deptA_action: specificRec.deptA_action,
          deptB_action: specificRec.deptB_action,
          timeline: specificRec.timeline,
          escalationNeeded: specificRec.escalationNeeded
        },
        context: fallback.context
      };
    }

    // Step 3: Analyse impact
    const impactResult = await callGLM("impactAgent", {
      conflict: conflictResult,
      record: enrichedRecord,
    });
    console.log("📊 Impact analysis:", impactResult);

    if (impactResult.error) {
      console.warn("⚠️ Falling back on impact analysis");
      // Continue with default impact
    }

    // Step 4: Generate decision with specific recommendation
    const decisionResult = await callGLM("decisionAgent", {
      conflict: conflictResult,
      impact: impactResult,
      record: enrichedRecord,
    });
    console.log("💡 Decision generated:", decisionResult);

    if (decisionResult.error) {
      console.warn("⚠️ Falling back to specific recommendation generator");
      const fallback = processRecordWorkflow(enrichedRecord, existingRecord);
      const specificRec = generateSpecificRecommendation(enrichedRecord, existingRecord, fallback.score);
      return {
        conflict: true,
        severity: conflictResult.severity || "Medium",
        actionType: conflictResult.actionType || "ESCALATE",
        aiSummary: {
          conflictReason: conflictResult.conflictReason || "Resource or schedule conflict detected",
          impact: impactResult,
          recommendation: specificRec.recommendation,
          deptA_action: specificRec.deptA_action,
          deptB_action: specificRec.deptB_action,
          timeline: specificRec.timeline,
          escalationNeeded: specificRec.escalationNeeded
        },
        context: {
          existingRecordId: conflictResult.matchedRecordId || existingRecord?.id || null,
        },
      };
    }

    // Success - return AI-generated response
    return {
      conflict: true,
      severity: conflictResult.severity || impactResult?.impactLevel || "Medium",
      actionType: decisionResult.actionType || conflictResult.actionType || "ESCALATE",
      aiSummary: {
        conflictReason: conflictResult.conflictReason || "Conflict detected between departments",
        impact: impactResult,
        recommendation: decisionResult.recommendation || "Coordinate with affected departments",
        deptA_action: decisionResult.deptA_action || "Review schedule and propose alternatives",
        deptB_action: decisionResult.deptB_action || "Coordinate with department A",
        timeline: decisionResult.timeline || "Within 24 hours",
        escalationNeeded: decisionResult.escalationNeeded || true,
      },
      context: {
        existingRecordId: conflictResult.matchedRecordId || existingRecord?.id || null,
      },
    };
  } catch (error) {
    console.error("❌ Agent loop error:", error.message);
    const fallback = processRecordWorkflow(newRecord, existingRecord);
    const specificRec = generateSpecificRecommendation(newRecord, existingRecord, fallback.score);
    return {
      conflict: fallback.conflict,
      severity: fallback.severity,
      actionType: fallback.actionType,
      aiSummary: {
        conflictReason: specificRec.recommendation,
        recommendation: specificRec.recommendation,
        deptA_action: specificRec.deptA_action,
        deptB_action: specificRec.deptB_action,
        timeline: specificRec.timeline,
        escalationNeeded: specificRec.escalationNeeded
      },
      context: fallback.context
    };
  }
}

module.exports = { runAgentLoop };