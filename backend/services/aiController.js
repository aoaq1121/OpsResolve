// controllers/aiController.js
// Simple 2-Tier Workflow: Z.AI GLM (Primary) + DUMB Fallback (Pattern Matching Only)

const { callGLMWithZ } = require("./glmServices");
const { detectConflictSimple, buildFallbackResponse } = require("./workflowEngine");
const mockRecords = require("../mockRecords");

/**
 * Main AI Controller: 2-Tier System
 * 
 * Tier 1: Z.AI GLM (Primary) ✅ INTELLIGENT
 *   - Performs 4-stage reasoning
 *   - Returns structured decision with confidence
 *   - Understands context, evaluates trade-offs
 * 
 * Tier 2: DUMB Fallback (Safety net) ❌ SIMPLE
 *   - Only pattern matching: same equipment + different department
 *   - NO reasoning, NO analysis, NO intelligence
 *   - Confidence: 20% (vs GLM's 85%)
 *   - Proves GLM is ESSENTIAL
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
    // STEP 2: TRY Z.AI GLM (Primary Tier) - INTELLIGENT REASONING
    // ════════════════════════════════════════════════════════════════
    console.log("📤 Calling Z.AI GLM for 4-stage reasoning...");
    const glmResult = await callGLMWithZ("unifiedAgent", record);

    // ════════════════════════════════════════════════════════════════
    // STEP 3: HANDLE RESPONSE (GLM or Fallback)
    // ════════════════════════════════════════════════════════════════
    if (glmResult.error) {
      // GLM FAILED → Use DUMB Fallback (Tier 2)
      // ⚠️ This shows what system can do WITHOUT intelligent reasoning
      console.warn("⚠️ GLM unavailable, switching to DUMB pattern-matching fallback");
      
      const conflictMatch = detectConflictSimple(mockRecords, record);
      const fallbackStages = buildFallbackResponse(!!conflictMatch, record);
      
      const fallbackResponse = {
        success: true,
        data: {
          executionId: `exec_${Date.now()}_fallback`,
          source: "dumb-fallback",
          warning: "⚠️ GLM unavailable - System degraded to pattern matching (confidence 20%)",
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          
          // ⚠️ All 4 stages are dumb defaults (no reasoning)
          input_understanding: fallbackStages.stage1_understanding,
          conflict_analysis: fallbackStages.stage2_conflict_detection,
          impact_analysis: fallbackStages.stage3_impact_analysis,
          decision: fallbackStages.stage4_decision,
          
          // Diagnostic: Show what fallback couldn't do
          fallback_limitations: {
            cannot_parse_natural_language: true,
            cannot_reason_about_context: true,
            cannot_analyze_root_causes: true,
            cannot_evaluate_tradeoffs: true,
            cannot_provide_intelligent_decisions: true,
            why_glm_is_essential: "Without GLM, system is just a dumb pattern matcher"
          }
        },
      };
      
      return res.status(200).json(fallbackResponse);
    }

    // GLM SUCCEEDED → Use GLM response (Tier 1)
    console.log("✅ GLM reasoning completed successfully");
    
    const glmReasoning = glmResult.data;
    const glmDecision = glmReasoning.stage4_decision || glmReasoning;

    // ════════════════════════════════════════════════════════════════
    // STEP 4: BUILD STRUCTURED RESPONSE FROM GLM (INTELLIGENT)
    // ════════════════════════════════════════════════════════════════
    const response = {
      success: true,
      data: {
        // Execution metadata
        executionId: `exec_${Date.now()}`,
        conflictId: `conflict_${Math.random().toString(36).substr(2, 9)}`,
        source: "z-ai-glm",
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),

        // 🟢 STAGE 1: Input Understanding (GLM UNDERSTOOD context)
        input_understanding: glmReasoning.stage1_understanding || {
          extracted_fields: record,
        },

        // 🟡 STAGE 2: Conflict Detection (GLM REASONED about conflicts)
        conflict_analysis: glmReasoning.stage2_conflict_detection || {
          conflict: false,
          conflict_type: "None",
          severity: "Low",
        },

        // 🟠 STAGE 3: Impact Analysis (GLM ANALYZED root causes)
        impact_analysis: glmReasoning.stage3_impact_analysis || {
          impact_level: "Low",
          root_cause: "No conflict detected",
          business_impact: "None",
          risk_level: "Low",
        },

        // 🔴 STAGE 4: Decision & Recommendation (GLM EVALUATED trade-offs)
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
