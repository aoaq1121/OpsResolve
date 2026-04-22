// Z.AI GLM Integration Guide
// OpsResolve Workflow Engine with Z.AI's Central Reasoning

/*

╔════════════════════════════════════════════════════════════════════════════╗
║                    Z.AI GLM INTEGRATION GUIDE                             ║
║           GLM as Central Reasoning Engine for OpsResolve                   ║
╚════════════════════════════════════════════════════════════════════════════╝


1. SETUP: Z.AI API CONFIGURATION
════════════════════════════════════════════════════════════════════════════

Step 1: Get Your Z.AI API Key
  └─ Sign up at: https://open.bigmodel.cn/
  └─ Create API key in dashboard
  └─ Copy key to environment variable

Step 2: Configure Environment Variable
  
  # Option A: Create .env file in backend/
  ZAI_API_KEY=sk_xxxxxxxxxxxxxxxxxxxx
  
  # Option B: Set in terminal (Linux/Mac)
  export ZAI_API_KEY=sk_xxxxxxxxxxxxxxxxxxxx
  
  # Option C: Set in PowerShell (Windows)
  $env:ZAI_API_KEY="sk_xxxxxxxxxxxxxxxxxxxx"

Step 3: Verify Configuration
  
  node -e "console.log(process.env.ZAI_API_KEY ? '✅ API Key configured' : '❌ API Key missing')"


2. ARCHITECTURE: GLM AS CENTRAL REASONING ENGINE
════════════════════════════════════════════════════════════════════════════

GLM PERFORMS 4-STAGE MULTI-STEP REASONING:

🟢 STAGE 1: INPUT UNDERSTANDING (Parsing)
   ├─ GLM reads unstructured input
   ├─ Extracts: resource, departments, time, urgency
   ├─ Identifies constraints and relationships
   └─ Output: Structured JSON for downstream reasoning

Example:
  Input: "Maintenance scheduled tomorrow but production needs machine urgently"
  GLM Understanding:
  {
    "resource": "Machine",
    "departments": ["Maintenance", "Production"],
    "time_constraint": "tomorrow",
    "urgency": "high",
    "nature": "schedule_conflict"
  }

🟡 STAGE 2: CONFLICT DETECTION (Logical Reasoning)
   ├─ GLM asks: Same resource used by multiple departments?
   ├─ GLM asks: Time overlap or scheduling conflict?
   ├─ GLM asks: Priority/urgency conflicts?
   ├─ GLM evaluates: Cross-department dependencies
   └─ Output: Conflict presence, type, severity

Example:
  GLM Logic:
    ✓ Same resource (Machine) → YES
    ✓ Multiple departments (Maintenance, Production) → YES
    ✓ Time overlap (tomorrow) → YES
    ✓ Conflicting urgency (scheduled vs. urgent) → YES
  
  Output:
  {
    "conflict": true,
    "conflict_type": "Resource Clash + Schedule Conflict",
    "severity": "High",
    "reasoning": "Same machine needed by both departments at overlapping times"
  }

🟠 STAGE 3: CAUSE + IMPACT ANALYSIS (Analytical Reasoning)
   ├─ GLM analyzes: Why did this happen?
   ├─ GLM evaluates: What happens if ignored?
   ├─ GLM assesses: Risk level and dependencies
   ├─ GLM considers: Second-order effects
   └─ Output: Root cause, business impact, risk level

Example:
  GLM Analysis:
    Root Cause: Poor scheduling coordination between departments
    Immediate Impact: Production delay, revenue loss
    Business Impact: $10K/hour downtime potential
    Risk Level: CRITICAL
  
  Output:
  {
    "root_cause": "Overlapping schedules between maintenance and production",
    "immediate_impact": "Production stops, scheduled maintenance cannot proceed",
    "business_impact": "Revenue loss from production downtime",
    "risk_level": "Critical",
    "urgency": "High"
  }

🔴 STAGE 4: DECISION & RECOMMENDATION (Evaluative Reasoning)
   ├─ GLM considers: Option A - delay maintenance
   ├─ GLM considers: Option B - delay production
   ├─ GLM considers: Option C - split schedule
   ├─ GLM evaluates: Trade-offs, costs, risks
   └─ Output: Optimal action with alternatives

Example:
  GLM Decision Process:
    Option A: Delay maintenance
      Cost: LOW (minimal financial impact)
      Risk: HIGH (equipment deteriorates)
      Timeline: Flexible (can reschedule)
    
    Option B: Delay production
      Cost: HIGH ($10K/hour revenue loss)
      Risk: MEDIUM (customer impact)
      Timeline: Not feasible (urgent order)
    
    Option C: Split schedule (use afternoon for one)
      Cost: MEDIUM (overtime, coordination)
      Risk: LOW (both completed safely)
      Timeline: Possible (6 hours available)
  
  Recommendation:
  {
    "recommendation": "Reschedule maintenance to afternoon (1 PM start)",
    "action_type": "RESCHEDULE",
    "rationale": "Minimize cost, protect production, complete both tasks safely",
    "alternatives": [
      "Use backup equipment for maintenance",
      "Extend maintenance to overnight shift",
      "Escalate to manager for approval"
    ],
    "confidence": 85,
    "critical_factors": ["Production urgency", "Equipment safety", "Department coordination"]
  }


3. HOW GLM SOLVES PROBLEMS (NOT JUST MATCHING KEYWORDS)
════════════════════════════════════════════════════════════════════════════

WITHOUT GLM (Rule-Based System):
  ❌ Can only match exact keywords
  ❌ Cannot understand context
  ❌ Cannot handle unstructured input
  ❌ Cannot reason about trade-offs
  ❌ Cannot make nuanced decisions
  ❌ Cannot adapt to new scenarios
  
  Example:
    Input: "Maintenance scheduled tomorrow but production needs the machine urgently"
    System: ❓ Cannot parse → fails

WITH GLM (Reasoning Engine):
  ✅ Understands natural language context
  ✅ Identifies hidden relationships
  ✅ Performs multi-step reasoning
  ✅ Evaluates trade-offs quantitatively
  ✅ Makes adaptive decisions
  ✅ Handles novel scenarios
  
  Example:
    Input: "Maintenance scheduled tomorrow but production needs the machine urgently"
    GLM: Understands:
      • Temporal conflict (tomorrow vs. now)
      • Resource conflict (same machine)
      • Priority conflict (scheduled vs. urgent)
      → Recommends optimal solution


4. IF GLM IS REMOVED: SYSTEM BREAKS
════════════════════════════════════════════════════════════════════════════

System would lose:

❌ UNDERSTANDING CAPABILITY
   └─ Cannot parse unstructured input
   └─ Cannot extract context and meaning

❌ REASONING CAPABILITY
   └─ Cannot perform multi-step analysis
   └─ Cannot evaluate complex scenarios

❌ DECISION-MAKING CAPABILITY
   └─ Cannot evaluate trade-offs
   └─ Cannot recommend optimal actions
   └─ Cannot adapt to new situations

❌ REASONING QUALITY
   └─ No causal analysis
   └─ No impact assessment
   └─ No risk evaluation

Result: System cannot function without GLM.
This proves GLM is the CORE INNOVATION, not a helper.


5. MULTI-AGENT REASONING WITH GLMS
════════════════════════════════════════════════════════════════════════════

Instead of 4 separate agents, GLM is ONE reasoning engine that can:

Sequential Reasoning (Stage-by-Stage):
  1. Understand input (parsing)
  2. Detect conflicts (logic)
  3. Analyze impact (analytics)
  4. Make decision (evaluation)
  └─ Each stage builds on previous

Parallel Reasoning (Multi-Criteria):
  1. Evaluate all options simultaneously
  2. Compare trade-offs in parallel
  3. Converge on optimal solution

Unified Reasoning (End-to-End):
  1. Input → Analysis → Decision (single GLM call)
  2. Faster than sequential
  3. Maintains context throughout


6. STRUCTURED OUTPUT (JSON)
════════════════════════════════════════════════════════════════════════════

GLM Response Format for Stage 4 (Final Decision):

{
  "conflict_detection": {
    "conflict": true,
    "conflict_type": "Resource Clash",
    "resource": "CNC Machine",
    "departments": ["Production", "Maintenance"],
    "severity": "High",
    "reason": "Same resource needed by multiple departments at overlapping times"
  },
  
  "cause_analysis": {
    "root_cause": "Poor scheduling coordination",
    "immediate_impact": "Production stops, maintenance cannot proceed",
    "business_impact": "Revenue loss, customer delay",
    "risk_level": "Critical"
  },
  
  "decision": {
    "recommendation": "Reschedule maintenance to afternoon (1 PM start)",
    "action_type": "RESCHEDULE",
    "rationale": "Protects production schedule, completes maintenance safely",
    "alternatives": [
      "Use backup equipment",
      "Extend to overnight shift",
      "Escalate to manager"
    ],
    "escalation_needed": false,
    "confidence": 85,
    "critical_factors": [
      "Production urgency level",
      "Equipment availability",
      "Department coordination"
    ]
  }
}


7. ERROR HANDLING & FALLBACK
════════════════════════════════════════════════════════════════════════════

If Z.AI API fails:
  1. Log error: API timeout, invalid key, rate limit, etc.
  2. Fall back to: Rule-based conflict detection
  3. Lower confidence score: Indicates fallback usage
  4. Escalate if: Confidence < 60%

Error Types:
  ├─ API Key invalid → 401 Unauthorized
  ├─ Rate limit exceeded → 429 Too Many Requests
  ├─ API timeout → Connection timeout
  ├─ Invalid response → JSON parse error
  └─ Network error → No internet connection

Handling:
  ```javascript
  try {
    const result = await callGLMWithZ("unifiedAgent", input);
    if (result.error) {
      // GLM failed, use fallback
      return processByRules(input);
    }
    return result;
  } catch (err) {
    // Network error, use fallback
    return processByRules(input);
  }
  ```


8. INTEGRATION WITH EXISTING SYSTEM
════════════════════════════════════════════════════════════════════════════

Current Files Updated:

✅ glmServices.js
   └─ Added callGLMWithZ() function
   └─ Implemented 4-stage reasoning prompts
   └─ Uses Z.AI API endpoint
   └─ Robust JSON parsing

✅ aiController.js (requires update)
   └─ Should use callGLMWithZ instead of callGLM
   └─ Pass environment variable: ZAI_API_KEY

✅ runAgentLoop.js (or replace with GLMDecisionController)
   └─ Uses callGLMWithZ for multi-stage reasoning

To Integrate:
  1. Set ZAI_API_KEY environment variable
  2. Update imports: const { callGLMWithZ } = require('./glmServices')
  3. Use: await callGLMWithZ("unifiedAgent", record)


9. TESTING Z.AI INTEGRATION
════════════════════════════════════════════════════════════════════════════

Test Script (save as test-zai.js):

const { callGLMWithZ } = require('./glmServices');

const testInput = {
  title: "Maintenance scheduled tomorrow",
  category: "Maintenance Request",
  location: "Line A",
  equipment: "CNC Machine",
  priority: "Normal",
  shift: "Morning",
  date: "2024-04-23",
  duration: "2–4 hours",
  impact: "Minor disruption",
  description: "Preventive maintenance for machine. But production needs this machine urgently tomorrow for urgent order."
};

async function test() {
  console.log("Testing Z.AI GLM Integration...\n");
  
  const result = await callGLMWithZ("unifiedAgent", testInput);
  
  if (result.error) {
    console.error("❌ Error:", result.error);
    console.error("Status:", result.status);
  } else {
    console.log("✅ Success!");
    console.log(JSON.stringify(result.data, null, 2));
  }
}

test();

Run:
  node test-zai.js


10. BEST PRACTICES
════════════════════════════════════════════════════════════════════════════

✅ DO:
  ├─ Use Z.AI API for complex reasoning
  ├─ Provide full context to GLM
  ├─ Cache results if repeated calls
  ├─ Monitor API costs and rate limits
  ├─ Log all GLM decisions for learning
  ├─ Handle failures gracefully
  └─ Calibrate confidence thresholds based on outcomes

❌ DON'T:
  ├─ Expose API key in code (use env vars)
  ├─ Make unnecessary GLM calls
  ├─ Ignore JSON parsing errors
  ├─ Forget error handling
  ├─ Assume GLM always succeeds
  ├─ Change prompts without testing
  └─ Forget to log execution traces


11. ENVIRONMENT CONFIGURATION
════════════════════════════════════════════════════════════════════════════

Create .env file in backend/:

  # Z.AI Configuration
  ZAI_API_KEY=sk_xxxxxxxxxxxxxxxxxxxx
  ZAI_API_ENDPOINT=https://open.bigmodel.cn/api/paas/v4/chat/completions
  
  # Optional: Model selection
  ZAI_MODEL=glm-4-flash
  ZAI_TEMPERATURE=0.7
  ZAI_TOP_P=0.9
  ZAI_MAX_TOKENS=2000


12. MONITORING & DEBUGGING
════════════════════════════════════════════════════════════════════════════

Check GLM Logs:
  grep -r "GLM" logs/
  grep -r "Z.AI" logs/

Monitor Performance:
  ├─ API response time
  ├─ Success rate
  ├─ Error frequency
  ├─ Confidence scores
  └─ Fallback usage

Debug Failed Calls:
  1. Check API key: echo $ZAI_API_KEY
  2. Check rate limits: HTTP 429
  3. Check response format: JSON parsing errors
  4. Check context size: Token limits
  5. Review prompts: Prompt effectiveness


═════════════════════════════════════════════════════════════════════════════
SUMMARY: Z.AI GLM is the central reasoning engine that enables OpsResolve
to understand unstructured inputs, perform multi-step reasoning, and make
optimal decisions. Without GLM, the system cannot function effectively.
═════════════════════════════════════════════════════════════════════════════

*/

module.exports = {
  guide: "Z.AI GLM Integration Guide",
};
