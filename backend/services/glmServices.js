const fetch = require("node-fetch");
require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const prompts = {
  inputAgent: `
You are an input parser for an operations management system.
Rules:
- Return ONLY valid JSON, no explanation, no markdown

Extract structured fields from the input and return:
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
You are a conflict detection engine for an operations management system.
Rules:
- Return ONLY valid JSON, no explanation
- Be SPECIFIC about WHY the conflict exists

Analyze whether the new record conflicts with the existing record and return:
{
  "conflict": true,
  "conflictReason": "detailed reason explaining the conflict",
  "matchedRecordId": null,
  "severity": "Low | Medium | High",
  "actionType": "ESCALATE | RESCHEDULE | COORDINATE"
}

If no conflict detected:
{
  "conflict": false,
  "conflictReason": null,
  "matchedRecordId": null,
  "severity": "Low",
  "actionType": "NONE"
}
`,

  impactAgent: `
You are an impact analysis engine for an operations management system.
Rules:
- Return ONLY valid JSON, no explanation
- Be SPECIFIC about operational consequences

Analyze the operational impact and return:
{
  "impactLevel": "Critical | Major | Minor",
  "reason": "Specific impact description",
  "riskNotes": "Specific risk notes"
}
`,

  decisionAgent: `
You are a decision engine for an operations management system.
Rules:
- Return ONLY valid JSON, no explanation
- Provide SPECIFIC, ACTIONABLE recommendations

Based on the conflict and impact data, return:
{
  "actionType": "ESCALATE | RESCHEDULE | COORDINATE",
  "recommendation": "Specific actionable recommendation",
  "confidence": 85,
  "escalationNeeded": true,
  "timeline": "Decision timeline",
  "deptA_action": "What Department A should do",
  "deptB_action": "What Department B should do"
}
`
};

async function callGLM(agentType, data, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const prompt = `${prompts[agentType]}\n\nInput data:\n${JSON.stringify(data, null, 2)}`;

      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error.message);

      const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error("Empty response from Gemini");

      const clean = content.replace(/```json|```/g, "").trim();
      const match = clean.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : JSON.parse(clean);

    } catch (err) {
      console.error(`Gemini call failed [${agentType}] attempt ${attempt}:`, err.message);
      if (attempt === retries) return { error: "Invalid AI response format" };
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

module.exports = { callGLM };
