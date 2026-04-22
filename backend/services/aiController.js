// controllers/aiController.js
// Z.AI GLM-Driven Workflow Decision Engine

const { callGLMWithZ } = require("../services/glmServices");
const mockRecords = require("../data/mockRecords");

/**
 * Detect conflicts using existing mock records (for comparison with GLM)
 */
function detectConflict(record) {
  return mockRecords.find((item) => {
    const sameEquipment =
      item.equipment && record.equipment && item.equipment === record.equipment;

    const sameLocation =
      item.location && record.location && item.location === record.location;

    const sameShift =
      item.shift && record.shift && item.shift === record.shift;

    const differentDepartment =
      item.department && record.department && item.department !== record.department;

    return (
      item.status !== "closed" &&
      differentDepartment &&
      (sameEquipment || sameLocation || sameShift)
    );
  }) || null;
}

/**
 * Main AI Controller using Z.AI GLM as central reasoning engine
 * GLM performs 4-stage multi-step reasoning:
 *   Stage 1: Input Understanding (Parsing unstructured data)
 *   Stage 2: Conflict Detection (Logical reasoning)
 *   Stage 3: Cause + Impact Analysis (Analytical reasoning)
 *   Stage 4: Decision & Recommendation (Evaluative reasoning)
 */
const aiController = async (req, res) => {
  try {
    const record = req.body;
    const startTime = Date.now();

    // ─────────────────────────────────────────────
    // 1. VALIDATE INPUT
    // ─────────────────────────────────────────────
    if (!record.title || !record.category || !record.description) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, category, description",
        required: ["title", "category", "description"],
      });
    }

    // ─────────────────────────────────────────────
    // 2. INVOKE Z.AI GLM FOR END-TO-END REASONING
    // ─────────────────────────────────────────────
    // GLM performs all 4 stages of reasoning in one unified call
    // This is more efficient than sequential stages and maintains context
    const glmResult = await callGLMWithZ("unifiedAgent", record);

    if (glmResult.error) {
      console.warn("⚠️ GLM reasoning failed, using rule-based fallback");
      
      // Fallback: Use rule-based conflict detection
      const conflictMatch = detectConflict(record);
      const rulesDecision = {
        stage1_understanding: {
          extracted_fields: record
        },
        stage2_conflict_detection: {
          conflict: !!conflictMatch,
          conflict_type: conflictMatch ? "Resource Clash" : "None",
          severity: conflictMatch ? "Medium" : "Low",
          reasoning: "Rule-based detection (GLM unavailable)"
        },
        stage3_impact_analysis: {
          impact_level: conflictMatch ? "Medium" : "Low",
          root_cause: conflictMatch ? "Resource overlap detected" : "No conflict",
          business_impact: conflictMatch ? "Potential operational disruption" : "None",
          risk_level: conflictMatch ? "Medium" : "Low"
        },
        stage4_decision: {
          recommendation: conflictMatch ? "Reschedule or coordinate" : "Proceed as planned",
          action_type: conflictMatch ? "RESCHEDULE" : "APPROVE",
          rationale: "Using rule-based fallback",
          confidence: 40  // Lower confidence due to fallback
        }
      };

      return res.status(200).json({
        success: true,
        data: {
          executionId: `exec_${Date.now()}`,
          source: "rule-based-fallback",
          processingTime: Date.now() - startTime,
          reasoning: rulesDecision,
          warning: "GLM API unavailable - using rule-based fallback",
          confidence: 40,
        },
      });
    }

    // ─────────────────────────────────────────────
    // 3. EXTRACT GLM REASONING RESULTS
    // ─────────────────────────────────────────────
    const glmReasoning = glmResult.data;
    const stage4Decision = glmReasoning.stage4_decision || glmReasoning;

    // ─────────────────────────────────────────────
    // 4. CONSTRUCT STRUCTURED RESPONSE
    // ─────────────────────────────────────────────
    const response = {
      success: true,
      data: {
        // Execution metadata
        executionId: `exec_${Date.now()}`,
        source: "z-ai-glm",
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),

        // GLM Stage 1: Input Understanding
        input_understanding: glmReasoning.stage1_understanding || {
          extracted_fields: record,
        },

        // GLM Stage 2: Conflict Detection
        conflict_analysis: glmReasoning.stage2_conflict_detection || {
          conflict: false,
          conflict_type: "None",
          severity: "Low",
        },

        // GLM Stage 3: Impact Analysis
        impact_analysis: glmReasoning.stage3_impact_analysis || {
          impact_level: "Low",
          root_cause: "No conflict detected",
          business_impact: "None",
          risk_level: "Low",
        },

        // GLM Stage 4: Decision & Recommendation
        decision: {
          recommendation: stage4Decision.recommendation || "No action needed",
          action_type: stage4Decision.action_type || "APPROVE",
          rationale: stage4Decision.rationale || "Based on GLM reasoning",
          alternatives: stage4Decision.alternatives || [],
          escalation_needed:
            stage4Decision.escalation_needed || stage4Decision.action_type === "ESCALATE",
          confidence: stage4Decision.confidence || 70,
        },

        // Full GLM reasoning (for debugging/learning)
        glm_reasoning: {
          full_response: glmReasoning,
          reasoning_stages: [
            "stage1_understanding",
            "stage2_conflict_detection",
            "stage3_impact_analysis",
            "stage4_decision",
          ],
        },

        // Comparison with rule-based
        rule_based_check: {
          detected_conflict: !!detectConflict(record),
          existing_record: detectConflict(record) || null,
        },
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("❌ AI Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error during GLM reasoning",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = { aiController };
