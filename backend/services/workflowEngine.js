// services/workflowEngine.js

function detectConflictSimple(mockRecords, newRecord) {
  if (!mockRecords || !newRecord) return null;
  
  // ONLY check: same equipment + different department
  // This is dumb pattern matching, NOT reasoning
  for (const existing of mockRecords) {
    if (existing.status === "closed") continue;
    
    const sameEquipment = 
      newRecord.equipment && 
      existing.equipment && 
      newRecord.equipment === existing.equipment;
    
    const differentDepartment =
      newRecord.department && 
      existing.department && 
      newRecord.department !== existing.department;
    
    if (sameEquipment && differentDepartment) {
      return existing;  // Found a conflict match
    }
  }
  
  return null;
}

/**
 * Build Fallback Response with Dumb Defaults
 * Maintains same JSON format as GLM response
 * BUT all values are dumb defaults (no reasoning)
 */
function buildFallbackResponse(conflictFound, record) {
  return {
    stage1_understanding: {
      extracted_fields: record,
      note: "FALLBACK: Only echoed input (cannot parse unstructured language)"
    },
    stage2_conflict_detection: {
      conflict: conflictFound,
      conflict_type: conflictFound ? "Possible Match" : "None",
      severity: "Unknown",  // Can't determine real severity without reasoning
      reasoning: "FALLBACK: Only checked if same equipment + department (no logical reasoning)"
    },
    stage3_impact_analysis: {
      impact_level: "Unknown",  // Can't analyze impact
      root_cause: "Unknown",     // Can't analyze causes
      business_impact: "Unknown",// Can't analyze business impact
      risk_level: "Unknown",     // Can't assess risk
      reasoning: "FALLBACK: Cannot perform impact analysis without reasoning"
    },
    stage4_decision: {
      recommendation: conflictFound ? "Reschedule" : "Approve",  // Dumb defaults
      action_type: conflictFound ? "RESCHEDULE" : "APPROVE",
      rationale: "FALLBACK: Simple default (no intelligent reasoning)",
      alternatives: [],  // Can't generate alternatives
      escalation_needed: false,  // Can't determine escalation
      confidence: 20  // Very low confidence due to lack of reasoning
    }
  };
}

module.exports = { detectConflictSimple, buildFallbackResponse };
