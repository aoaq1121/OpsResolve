const fetch = require("node-fetch");
require("dotenv").config();

const API_URL = "https://api.ilmu.ai/v1/chat/completions";
const API_KEY = process.env.ILMU_API_KEY;

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

Analyze whether the new record conflicts with the existing record and return:
{
  "conflict": true,
  "conflictReason": "",
  "matchedRecordId": null,
  "severity": "Low | Medium | High"
}

If no conflict detected:
{
  "conflict": false,
  "conflictReason": null,
  "matchedRecordId": null,
  "severity": "Low"
}
`,

  impactAgent: `
You are an impact analysis engine for an operations management system.

Rules:
- Return ONLY valid JSON, no explanation

Analyze the operational impact and return:
{
  "impactLevel": "",
  "reason": "",
  "riskNotes": ""
}
`,

  decisionAgent: `
You are a decision engine for an operations management system.

Rules:
- Return ONLY valid JSON, no explanation

Based on the conflict and impact data, return a recommended action:
{
  "actionType": "",
  "recommendation": "",
  "confidence": 85,
  "escalationNeeded": true
}
`
};

async function callGLM(agentType, data) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "ilmu-glm-5.1",
        messages: [
          {
            role: "system",
            content: prompts[agentType],
          },
          {
            role: "user",
            content: `Input data:\n${JSON.stringify(data, null, 2)}`,
          },
        ],
      }),
    });

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;

    if (!content) throw new Error("Empty response from API");

    const clean = content.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error(`GLM call failed [${agentType}]:`, err.message);
    return { error: "Invalid AI response format" };
  }
}

module.exports = { callGLM };
