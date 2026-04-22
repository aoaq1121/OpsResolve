// services/glmServices.js
// Z.AI GLM Integration for OpsResolve Workflow Engine
// GLM acts as the central reasoning engine with 4-stage pipeline

async function callGLMWithZ(agentType, data) {
  // ─────────────────────────────────────────────────────────────────────
  // Z.AI Endpoint Configuration
  // ─────────────────────────────────────────────────────────────────────
  const Z_AI_API_KEY = process.env.ZAI_API_KEY || "YOUR_ZAI_API_KEY";
  const Z_AI_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

  // ─────────────────────────────────────────────────────────────────────
  // 1. MULTI-STAGE GLM REASONING PROMPTS
  // GLM Performs:
  //   Stage 1: Input Understanding (Parsing unstructured data)
  //   Stage 2: Conflict Detection (Logical reasoning)
  //   Stage 3: Cause + Impact Analysis (Analytical reasoning)
  //   Stage 4: Decision & Recommendation (Evaluative reasoning)
  // ─────────────────────────────────────────────────────────────────────
  const promptMap = {
    // Stage 1: INPUT UNDERSTANDING (Parsing)
    // GLM extracts structured data from unstructured input
    inputAgent: `
You are OpsResolve Input Understanding Agent (Stage 1/4).

ROLE: Parse unstructured input into structured data.
GLM CAPABILITY: Extract meaning from natural language, identify key entities.

TASK:
1. Understand the unstructured input
2. Extract key entities: resource, departments, time, urgency
3. Identify constraints and relationships
4. Return structured JSON for downstream reasoning

STRICT OUTPUT (JSON ONLY):
{
  "title": "extracted title",
  "category": "category type",
  "location": "location/area",
  "equipment": "equipment/resource involved",
  "priority": "Normal|High|Critical",
  "shift": "shift information",
  "date": "date if mentioned",
  "duration": "duration if mentioned",
  "impact": "impact level",
  "description": "full context"
}

NO EXPLANATION. ONLY JSON.
`,

    // Stage 2: CONFLICT DETECTION (Logical Reasoning)
    // GLM reasons about whether conflicts exist
    conflictAgent: `
You are OpsResolve Conflict Detection Agent (Stage 2/4).

ROLE: Detect operational conflicts using logical reasoning.
GLM CAPABILITY: Multi-step logical reasoning, constraint checking.

TASK:
1. Analyze if same resource is used by multiple departments
2. Check for time overlap/scheduling conflicts
3. Identify priority/urgency conflicts
4. Evaluate cross-department dependencies
5. Determine conflict type and severity

REASONING PROCESS:
- Is the same equipment requested by multiple departments? → Resource Clash
- Are there conflicting time windows? → Schedule Conflict
- Are there priority conflicts? → Urgency Clash
- Are there process dependencies? → Workflow Conflict

STRICT OUTPUT (JSON ONLY):
{
  "conflict": boolean,
  "conflict_type": "Resource Clash|Schedule Conflict|Urgency Clash|Workflow Conflict|None",
  "conflict_reason": "detailed reasoning of why conflict exists",
  "severity": "Low|Medium|High",
  "conflicting_departments": ["Dept1", "Dept2"],
  "resource_conflict": "which resource if applicable"
}

NO EXPLANATION. ONLY JSON.
`,

    // Stage 3: CAUSE + IMPACT ANALYSIS (Analytical Reasoning)
    // GLM analyzes why conflict happened and what it means
    impactAgent: `
You are OpsResolve Impact Analysis Agent (Stage 3/4).

ROLE: Analyze cause and impact of conflicts.
GLM CAPABILITY: Causal reasoning, consequence analysis, risk assessment.

TASK:
1. Analyze the ROOT CAUSE of the conflict
2. Identify BUSINESS IMPACT (financial, operational, reputational)
3. Assess RISK LEVEL and DEPENDENCIES
4. Evaluate URGENCY and SEVERITY
5. Consider SECOND-ORDER EFFECTS

IMPACT CATEGORIES:
- Production Impact: Revenue loss, delivery delay, quality issues
- Resource Impact: Machine downtime, equipment unavailability
- Organizational Impact: Workflow disruption, team inefficiency
- Business Impact: Cost escalation, customer satisfaction, compliance

STRICT OUTPUT (JSON ONLY):
{
  "impact_level": "None|Low|Medium|High|Critical",
  "root_cause": "why did this happen",
  "immediate_impact": "what happens if ignored",
  "business_impact": "financial/operational consequences",
  "risk_level": "Low|Medium|High|Critical",
  "dependencies": ["affected process 1", "affected process 2"],
  "urgency": "Low|Medium|High|Critical"
}

NO EXPLANATION. ONLY JSON.
`,

    // Stage 4: DECISION & RECOMMENDATION (Evaluative Reasoning)
    // GLM makes the final decision
    decisionAgent: `
You are OpsResolve Decision Making Agent (Stage 4/4).

ROLE: Make optimal decisions considering all factors.
GLM CAPABILITY: Multi-criteria decision making, option evaluation, trade-off analysis.

TASK:
1. Consider ALL available options
2. Evaluate trade-offs for each option
3. Consider business priorities and constraints
4. Recommend OPTIMAL action
5. Suggest ALTERNATIVES if primary option fails

DECISION FRAMEWORK:
Option A: Delay maintenance → Cost: low, Risk: high
Option B: Delay production → Cost: high, Risk: medium
Option C: Split schedule → Cost: medium, Risk: low
Option D: Use alternative → Cost: medium, Risk: low
Option E: Escalate decision → Cost: medium, Risk: low

Then rank by:
1. Business impact (revenue, customer satisfaction)
2. Operational efficiency (team productivity, resource utilization)
3. Risk mitigation (safety, compliance, quality)
4. Cost effectiveness

STRICT OUTPUT (JSON ONLY):
{
  "recommendation": "recommended action with reasoning",
  "action_type": "ESCALATE|RESCHEDULE|COORDINATE|APPROVE|REJECT",
  "rationale": "why this is best option",
  "alternatives": ["option 1", "option 2", "option 3"],
  "escalation_needed": boolean,
  "confidence": 0-100,
  "critical_factors": ["factor1", "factor2"]
}

NO EXPLANATION. ONLY JSON.
`,

    // UNIFIED REASONING (for end-to-end GLM decision)
    unifiedAgent: `
You are OpsResolve Unified Reasoning Agent.

ROLE: Perform complete multi-stage reasoning in one call.
GLM CAPABILITY: End-to-end logical, analytical, and evaluative reasoning.

PERFORM ALL 4 STAGES:
1. UNDERSTAND the unstructured input
2. DETECT conflicts using logical reasoning
3. ANALYZE cause and impact
4. DECIDE on optimal action

INPUT: Unstructured operational request
OUTPUT: Complete decision with reasoning

STRICT OUTPUT (JSON ONLY):
{
  "stage1_understanding": {
    "extracted_fields": { title, category, location, equipment, priority, shift, date, duration, impact, description }
  },
  "stage2_conflict_detection": {
    "conflict": boolean,
    "conflict_type": "...",
    "severity": "Low|Medium|High",
    "reasoning": "step-by-step conflict detection logic"
  },
  "stage3_impact_analysis": {
    "impact_level": "Low|Medium|High|Critical",
    "root_cause": "...",
    "business_impact": "...",
    "risk_level": "..."
  },
  "stage4_decision": {
    "recommendation": "...",
    "action_type": "ESCALATE|RESCHEDULE|COORDINATE|APPROVE|REJECT",
    "rationale": "...",
    "confidence": 0-100
  }
}

NO EXPLANATION. ONLY JSON.
`
  };

  try {
    // ─────────────────────────────────────────────────────────────────────
    // 2. Z.AI API REQUEST
    // ─────────────────────────────────────────────────────────────────────
    const response = await fetch(Z_AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Z_AI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "glm-4-flash",  // Z.AI's latest GLM model
        messages: [
          {
            role: "system",
            content: promptMap[agentType] || promptMap.unifiedAgent
          },
          {
            role: "user",
            content: `OpsResolve Request:\n${JSON.stringify(data, null, 2)}`
          }
        ],
        temperature: 0.7,  // Balanced: creative reasoning + consistency
        top_p: 0.9,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      console.error(`❌ Z.AI API Error: ${response.status} ${response.statusText}`);
      return {
        error: `Z.AI API failed: ${response.statusText}`,
        status: response.status
      };
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("❌ No content in Z.AI response");
      return { error: "Empty response from Z.AI" };
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. SAFE JSON PARSING (Robust handling)
    // ─────────────────────────────────────────────────────────────────────
    try {
      // Try parsing the content directly
      const parsed = JSON.parse(content);
      return {
        success: true,
        data: parsed,
        reasoning: content  // Keep original reasoning
      };
    } catch (parseErr) {
      // Try extracting JSON from markdown if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          return {
            success: true,
            data: parsed,
            reasoning: content
          };
        } catch (_) {
          // Fall through to error handling
        }
      }

      console.error("❌ GLM JSON parse failed:", content);
      return {
        error: "Invalid JSON response from GLM",
        raw: content,
        suggestion: "Check GLM prompt format or API response"
      };
    }
  } catch (err) {
    console.error("❌ GLM Service Error:", err.message);
    return {
      error: err.message,
      type: "network_error"
    };
  }
}

// Export for both CommonJS and ES modules
module.exports = { callGLMWithZ, callGLM: callGLMWithZ };

// Also support export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports.callGLMWithZ = callGLMWithZ;
}