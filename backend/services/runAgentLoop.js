const { callGLM } = require("./glmServices");
const { processRecordWorkflow } = require("./workflowEngine");

function checkMissingFields(data) {
  const required = ["equipment", "location", "shift"];
  return required.filter((field) => !data[field]);
}

function generateSpecificRecommendation(newRecord, existingRecord, conflictScore) {
  const deptA = newRecord.department || "Department A";
  const deptB = existingRecord?.department || "Department B";
  const equipment = newRecord.equipment || existingRecord?.equipment || null;
  const location = newRecord.location || existingRecord?.location || null;
  const shift = newRecord.shift || "the same shift";
  const date = newRecord.date || existingRecord?.date || "the same date";
  const titleA = newRecord.title || newRecord.workOrderNo || "new record";
  const titleB = existingRecord?.title || existingRecord?.workOrderNo || "existing record";

  // Determine conflict type
  const sameEquipment = equipment &&
    newRecord.equipment?.toLowerCase() === existingRecord?.equipment?.toLowerCase();
  const sameLocation = location &&
    newRecord.location?.toLowerCase() === existingRecord?.location?.toLowerCase();
  const sameDept = deptA === deptB;

  let conflictReason, whyConflicts, risk, impact, recommendation;

  if (sameEquipment && sameDept) {
    conflictReason = `Two ${deptA} work orders — ${titleA} and ${titleB} — both require ${equipment} during the ${shift} shift on ${date}.`;
    whyConflicts = `${equipment} can only run one job at a time. Both work orders are scheduled for the same machine, same shift, and same date — making simultaneous execution impossible.`;
    risk = `If unresolved, one work order will be delayed, potentially missing the production deadline.`;
    impact = `Production output for ${date} will be reduced if scheduling is not adjusted before the shift begins.`;
    recommendation = `Prioritise ${titleA} for the ${shift} shift on ${date}. Reschedule ${titleB} to the next available shift or use an alternative machine if available.`;
  } else if (sameEquipment) {
    conflictReason = `${deptA} (${titleA}) and ${deptB} (${titleB}) both require ${equipment} during the ${shift} shift on ${date}.`;
    whyConflicts = `${equipment} is a shared resource that cannot serve two departments simultaneously. Both departments have scheduled it for the same time window.`;
    risk = `One department will be blocked from proceeding, causing downstream delays in operations.`;
    impact = `${deptB} operations may be halted if ${deptA} takes priority, or vice versa. Coordination is needed to avoid a full stop.`;
    recommendation = `Schedule a joint coordination between ${deptA} and ${deptB} to split the ${equipment} usage. Consider allocating the first half of the shift to one department and the second half to the other.`;
  } else if (sameLocation) {
    conflictReason = `${deptA} (${titleA}) and ${deptB} (${titleB}) are both scheduled at ${location} during the ${shift} shift on ${date}.`;
    whyConflicts = `${location} cannot accommodate both operations simultaneously. The space and resources at this location are required by both departments at the same time.`;
    risk = `Operations at ${location} will be disrupted if both departments arrive without a coordinated plan.`;
    impact = `One or both operations will be delayed, affecting the overall production schedule for ${date}.`;
    recommendation = `Stagger the two activities — allow one department to use ${location} for the first part of the shift, then hand over to the second. Notify both supervisors immediately.`;
  } else {
    conflictReason = `${deptA} (${titleA}) and ${deptB} (${titleB}) have overlapping requirements during the ${shift} shift on ${date}.`;
    whyConflicts = `Both records share scheduling or resource dependencies that create a conflict in the operational plan.`;
    risk = `Without coordination, one department's operations may block or delay the other.`;
    impact = `Operational efficiency on ${date} will be reduced if this conflict is not resolved before the shift starts.`;
    recommendation = `Coordinate between ${deptA} and ${deptB} to align schedules. Review both records and identify which activity has higher priority or can be rescheduled with minimal impact.`;
  }

  const severity = conflictScore >= 70 ? "High" : conflictScore >= 40 ? "Medium" : "Low";
  const escalationNeeded = conflictScore >= 70;

  return {
    conflictReason,
    whyConflicts,
    risk,
    impact,
    recommendation,
    escalationNeeded,
    severity,
  };
}

async function runAgentLoop(newRecord, existingRecord) {
  try {
    console.log("🤖 Running AI agent loop...");

    const extracted = await callGLM("inputAgent", newRecord);
    console.log("📝 Input parsed:", extracted);

    if (extracted.error) {
      console.warn("⚠️ Falling back to rule-based (input parsing failed)");
      const fallback = processRecordWorkflow(newRecord, existingRecord);
      const rec = generateSpecificRecommendation(newRecord, existingRecord, fallback.score);
      return buildFallbackResponse(fallback, rec, existingRecord);
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
          aiSummary: { recommendation: "No action needed. Proceed with normal operations." },
        };
      }
      const fallback = processRecordWorkflow(enrichedRecord, existingRecord);
      const rec = generateSpecificRecommendation(enrichedRecord, existingRecord, fallback.score);
      return buildFallbackResponse(fallback, rec, existingRecord);
    }

    const impactResult = await callGLM("impactAgent", {
      conflict: conflictResult,
      record: enrichedRecord,
    });
    console.log("📊 Impact analysis:", impactResult);

    const decisionResult = await callGLM("decisionAgent", {
      conflict: conflictResult,
      impact: impactResult,
      record: enrichedRecord,
    });
    console.log("💡 Decision generated:", decisionResult);

    if (decisionResult.error) {
      const fallback = processRecordWorkflow(enrichedRecord, existingRecord);
      const rec = generateSpecificRecommendation(enrichedRecord, existingRecord, fallback.score);
      return {
        conflict: true,
        severity: conflictResult.severity || rec.severity,
        actionType: conflictResult.actionType || "ESCALATE",
        aiSummary: {
          conflictReason: rec.conflictReason,
          whyConflicts: rec.whyConflicts,
          risk: rec.risk,
          impact: rec.impact,
          recommendation: rec.recommendation,
          escalationNeeded: rec.escalationNeeded,
        },
        context: { existingRecordId: conflictResult.matchedRecordId || existingRecord?.id || null },
      };
    }

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
      context: { existingRecordId: conflictResult.matchedRecordId || existingRecord?.id || null },
    };
  } catch (error) {
    console.error("❌ Agent loop error:", error.message);
    const fallback = processRecordWorkflow(newRecord, existingRecord);
    const rec = generateSpecificRecommendation(newRecord, existingRecord, fallback.score);
    return buildFallbackResponse(fallback, rec, existingRecord);
  }
}

function buildFallbackResponse(fallback, rec, existingRecord) {
  return {
    conflict: fallback.conflict,
    severity: rec.severity || fallback.severity,
    actionType: fallback.actionType,
    status: fallback.conflict ? "CONFLICT_DETECTED" : "OK",
    aiSummary: {
      conflictReason: rec.conflictReason,
      whyConflicts: rec.whyConflicts,
      risk: rec.risk,
      impact: rec.impact,
      recommendation: rec.recommendation,
      escalationNeeded: rec.escalationNeeded,
    },
    context: fallback.context,
  };
}

module.exports = { runAgentLoop };
