export async function callGLM(agentType, data) {

  // ─────────────────────────────────────────────
  // 1. STRONG STRICT PROMPTS (improved)
  // ─────────────────────────────────────────────
  const promptMap = {
    inputAgent: `
You are OpsResolve Input Agent.

STRICT RULES:
- Return ONLY valid JSON
- No explanation
- No markdown
- No extra text

TASK:
Extract structured fields from input data.

OUTPUT FORMAT:
{
  "title": "",
  "category": "",
  "location": "",
  "equipment": "",
  "priority": "",
  "shift": "",
  "date": "",
  "duration": "",
  "impact": "",
  "description": ""
}
`,

    conflictAgent: `
You are OpsResolve Conflict Agent.

STRICT RULES:
- Return ONLY valid JSON
- No explanation

TASK:
Detect operational conflict between new record and existing system.

OUTPUT FORMAT:
{
  "conflict": true,
  "conflictReason": "",
  "matchedRecordId": null,
  "severity": "Low | Medium | High"
}

If no conflict:
{
  "conflict": false,
  "conflictReason": null,
  "matchedRecordId": null,
  "severity": "Low"
}
`,

    impactAgent: `
You are OpsResolve Impact Agent.

STRICT RULES:
- Return ONLY valid JSON
- No explanation

OUTPUT FORMAT:
{
  "impactLevel": "",
  "reason": "",
  "riskNotes": ""
}
`,

    decisionAgent: `
You are OpsResolve Decision Agent.

STRICT RULES:
- Return ONLY valid JSON
- No explanation

OUTPUT FORMAT:
{
  "actionType": "",
  "recommendation": "",
  "escalationNeeded": true
}
`
  };

  // ─────────────────────────────────────────────
  // 2. SAFE REQUEST
  // ─────────────────────────────────────────────
  const response = await fetch("ZAI_GLM_ENDPOINT", {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_KEY",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "glm-4",
      messages: [
        {
          role: "system",
          content: promptMap[agentType]
        },
        {
          role: "user",
          content: `OpsResolve Input Data:\n${JSON.stringify(data, null, 2)}`
        }
      ]
    })
  });

  const result = await response.json();

  const content = result?.choices?.[0]?.message?.content;

  // ─────────────────────────────────────────────
  // 3. SAFE JSON PARSING (IMPORTANT FIX)
  // ─────────────────────────────────────────────
  try {
    return JSON.parse(content);
  } catch (err) {
    console.error("❌ GLM JSON parse failed:", content);

    return {
      error: "Invalid AI response format",
      raw: content
    };
  }
}