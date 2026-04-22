// controllers/aiController.js
// Simple 2-Tier Workflow: Z.AI GLM (Primary) + Rule-Based Fallback

const { callGLMWithZ } = require("./glmServices");
const mockRecords = require("../data/mockRecords");

/**
 * Rule-Based Fallback: Simple conflict detection for when GLM is unavailable
 */
function detectConflictRuleBased(record) {
  return mockRecords.find((item) => {
    const sameEquipment =
      item.equipment && record.equipment && item.equipment === record.equipment;
    const sameLocation =
      item.location && record.location && item.location === record.location;
    const sameShift = item.shift && record.shift && item.shift === record.shift;
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
 * Main AI Controller: 2-Tier System
 * 
 * Tier 1: Z.AI GLM (Primary)
 *   - Performs 4-stage reasoning
 *   - Returns structured decision with confidence
 * 
 * Tier 2: Rule-Based Fallback (Safety net)
 *   - Simple conflict detection
 *   - Lower confidence (40%)
 */
const aiController = async (req, res) => {
  try {
    const record = req.body;
    const startTime = Date.now();

    // ════════════════════════════════════════════════════════════════
    // STEP 1: VALIDATE INPUT
    // ════════════════════════════════════════════════════════════════
    if (!record.title || !record.category || !record.description) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, category, description",
        required: ["title", "category", "description"],
      });
    }

    // ════════════════════════════════════════════════════════════════
    // STEP 2: TRY Z.AI GLM (Primary Tier)
    // ════════════════════════════════════════════════════════════════
    console.log("📤 Calling Z.AI GLM for 4-stage reasoning...");
    const glmResult = await callGLMWithZ("unifiedAgent", record);

    // ════════════════════════════════════════════════════════════════
    // STEP 3: HANDLE RESPONSE (GLM or Fallback)
    // ════════════════════════════════════════════════════════════════
    if (glmResult.error) {
      // GLM FAILED → Use Rule-Based Fallback (Tier 2)
      console.warn("⚠️ GLM unavailable, switching to rule-based fallback");
      
      const conflictMatch = detectConflictRuleBased(record);
      const fallbackResponse = {
        success: true,
        data: {
          executionId: `exec_${Date.now()}_fallback`,
          source: "rule-based-fallback",
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          
          // Stage 1: Just echo the input
          input_understanding: {
            extracted_fields: record,
          },
          
          // Stage 2: Simple conflict detection
          conflict_analysis: {
            conflict: !!conflictMatch,
            conflict_type: conflictMatch ? "Resource Clash" : "None",
            severity: conflictMatch ? "Medium" : "Low",
            reasoning: "Rule-based detection (GLM unavailable)",
          },
          
          // Stage 3: Basic impact
          impact_analysis: {
            impact_level: conflictMatch ? "Medium" : "Low",
            root_cause: conflictMatch ? "Resource overlap detected" : "No conflict",
            business_impact: conflictMatch ? "Potential operational disruption" : "None",
            risk_level: conflictMatch ? "Medium" : "Low",
          },
          
          // Stage 4: Simple recommendation
          decision: {
            recommendation: conflictMatch 
              ? "Reschedule to avoid conflict" 
              : "Proceed as planned",
            action_type: conflictMatch ? "RESCHEDULE" : "APPROVE",
            rationale: "Using fallback rules (GLM unavailable)",
            alternatives: conflictMatch 
              ? ["Coordinate with other department", "Use alternative resource"]
              : [],
            escalation_needed: false,
            confidence: 40, // Low confidence due to fallback
          },
          
          // Warning indicator
          warning: "GLM API unavailable - using rule-based fallback",
        },
      };
      
      return res.status(200).json(fallbackResponse);
    }

    // GLM SUCCEEDED → Use GLM response (Tier 1)
    console.log("✅ GLM reasoning completed successfully");
    
    const glmReasoning = glmResult.data;
    const glmDecision = glmReasoning.stage4_decision || glmReasoning;

    // ════════════════════════════════════════════════════════════════
    // STEP 4: BUILD STRUCTURED RESPONSE FROM GLM
    // ════════════════════════════════════════════════════════════════
    const response = {
      success: true,
      data: {
        // Execution metadata
        executionId: `exec_${Date.now()}`,
        source: "z-ai-glm",
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),

        // 🟢 STAGE 1: Input Understanding (GLM parsed unstructured input)
        input_understanding: glmReasoning.stage1_understanding || {
          extracted_fields: record,
        },

        // 🟡 STAGE 2: Conflict Detection (GLM detected conflicts)
        conflict_analysis: glmReasoning.stage2_conflict_detection || {
          conflict: false,
          conflict_type: "None",
          severity: "Low",
        },

        // 🟠 STAGE 3: Impact Analysis (GLM analyzed root cause & business impact)
        impact_analysis: glmReasoning.stage3_impact_analysis || {
          impact_level: "Low",
          root_cause: "No conflict detected",
          business_impact: "None",
          risk_level: "Low",
        },

        // 🔴 STAGE 4: Decision & Recommendation (GLM made the decision)
        decision: {
          recommendation: glmDecision.recommendation || "No action needed",
          action_type: glmDecision.action_type || "APPROVE",
          rationale: glmDecision.rationale || "Based on GLM reasoning",
          alternatives: glmDecision.alternatives || [],
          escalation_needed: glmDecision.escalation_needed || false,
          confidence: glmDecision.confidence || 75,
        },

        // Full GLM response (for debugging and transparency)
        glm_reasoning: {
          all_stages: glmReasoning,
          pipeline: [
            "stage1_understanding",
            "stage2_conflict_detection",
            "stage3_impact_analysis",
            "stage4_decision",
          ],
        },
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("❌ AI Controller Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = { aiController };
