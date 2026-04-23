const fetch = require("node-fetch");
require("dotenv").config();

const API_URL = "https://api.ilmu.ai/v1/chat/completions";
const API_KEY = process.env.ILMU_API_KEY;

const prompts = {
  documentAnalyzer: `
You are an expert document analyzer for an operations management system.

Your task: Analyze the provided document (PDF report, maintenance log, etc.) and extract ALL operational information.

Rules:
- Return ONLY valid JSON, no explanation, no markdown
- Extract EVERY important detail from the document
- Identify: issues, equipment mentioned, locations, timelines, impact, severity, requirements
- Be thorough and precise

Return structured analysis:
{
  "extractedTitle": "Main issue or subject from document",
  "extractedCategory": "Equipment Fault|Maintenance Request|Incident Report|Production Log|Quality Check|Schedule Change|Resource Allocation",
  "extractedLocation": "Specific area/line mentioned",
  "extractedEquipment": "All equipment/machines mentioned",
  "extractedPriority": "Critical|High|Normal|Low",
  "extractedShift": "Morning|Afternoon|Night or 'Unknown'",
  "extractedIssues": ["Issue 1", "Issue 2", "Issue 3"],
  "extractedImpact": "Detailed impact description",
  "extractedRiskFactors": ["Risk 1", "Risk 2"],
  "extractedActions": ["Action 1", "Action 2"],
  "documentSummary": "Comprehensive summary of the document",
  "confidence": 85
}
`,

  imageAnalyzer: `
You are an expert visual analyzer for an operations management system.

Your task: Analyze the provided image (equipment photo, whiteboard notes, screen capture, etc.) and extract operational insights.

Rules:
- Return ONLY valid JSON, no explanation, no markdown
- Describe what you see in detail
- Identify: equipment condition, problems, error messages, handwritten notes, visual indicators
- Infer operational context

Return structured analysis:
{
  "imageDescription": "Detailed description of what's visible in the image",
  "identifiedEquipment": "Equipment/machine visible",
  "identifiedLocation": "Location/area if visible",
  "identifiedProblems": ["Problem 1", "Problem 2"],
  "readableText": "Any text, error messages, or notes visible in image",
  "visualIndicators": ["Indicator 1", "Indicator 2"],
  "estimatedSeverity": "Critical|High|Medium|Low",
  "suggestedCategory": "Equipment Fault|Maintenance Request|Incident Report|Quality Check",
  "imageSummary": "Comprehensive summary of what the image tells you",
  "confidence": 85
}
`,

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
