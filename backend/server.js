require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { aiController } = require("./controllers/aiController");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.post("/api/submit-record", aiController);

// ── Helper: call Gemini API ───────────────────────────────────────────────────
async function callGemini(prompt, file = null) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const parts = [];

  // Add file if provided (PDF or image)
  if (file) {
    parts.push({
      inline_data: {
        mime_type: file.mediaType,
        data: file.base64,
      },
    });
  }

  parts.push({ text: prompt });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1000 },
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ── AI Extract endpoint ───────────────────────────────────────────────────────
app.post("/api/ai-extract", async (req, res) => {
  try {
    const { prompt, file, department, pastRecords } = req.body;

    let geminiFile = null;

    if (file) {
      // Send file directly to Gemini — it supports PDF and images natively
      geminiFile = file;
    }

    // Build prompt
    const fullPrompt = prompt;

    // Step 1: Extract fields
    console.log("Calling Gemini, prompt length:", fullPrompt.length);
    const extractedRaw = await callGemini(fullPrompt, geminiFile);
    console.log("Gemini response:", extractedRaw.substring(0, 300));

    // Parse JSON from response
    let extracted = {};
    try {
      const clean = extractedRaw.replace(/```json|```/g, "").trim();
      extracted = JSON.parse(clean);
    } catch {
      // Try to extract JSON object from response
      const match = extractedRaw.match(/\{[\s\S]*\}/);
      if (match) {
        try { extracted = JSON.parse(match[0]); } catch { extracted = {}; }
      }
    }
    console.log("Step 1 extracted:", JSON.stringify(extracted));

    // Skip imputation if extraction failed
    const extractionFailed = !extracted || Object.values(extracted).every(v => v === null || v === undefined);
    if (extractionFailed) {
      res.json({ text: extractedRaw, parsed: extracted || {}, aiSuggested: [] });
      return;
    }

    // Step 2: Impute missing fields from past records
    let imputed = {};
    let aiSuggested = [];

    console.log("pastRecords received:", pastRecords?.length || 0);
    if (pastRecords && pastRecords.length > 0) {
      const knownMachines = ["Welding Machine W-01", "Welding Machine W-02", "Sanding Machine S-01", "Sanding Machine S-02", "CNC Machine C-01", "Assembly Station A-01", "Assembly Station A-02", "Painting Booth P-01", "Packaging Line PK-01"];
      const missingFields = Object.entries(extracted)
        .filter(([k, v]) => {
          if (v === null || v === undefined || v === "") return true;
          // Treat equipment as missing if it's not a known machine name
          if (k === "equipment" && !knownMachines.some(m => m.toLowerCase() === String(v).toLowerCase())) return true;
          return false;
        })
        .map(([k]) => k);

      console.log("Missing fields to impute:", missingFields);

      if (missingFields.length > 0) {
        const historyStr = pastRecords
          .slice(0, 3)
          .map((r, i) => `Record ${i + 1}: ${JSON.stringify({
            processType: r.processType, location: r.location,
            equipment: r.equipment, shift: r.shift, duration: r.duration,
            inspectionType: r.inspectionType, sampleSize: r.sampleSize,
            qcStation: r.qcStation, disposition: r.disposition,
          })}`)
          .join("\n");

        const imputePrompt = `Based on these past ${department} records:\n${historyStr}\n\nSuggest values for missing fields: ${missingFields.join(", ")}.\nCurrent data: ${JSON.stringify(extracted)}.\nReturn ONLY a JSON object with just the missing fields. No explanation.`;

        const imputedRaw = await callGemini(imputePrompt);
        try {
          const clean = imputedRaw.replace(/```json|```/g, "").trim();
          const match = clean.match(/\{[\s\S]*\}/);
          imputed = match ? JSON.parse(match[0]) : {};
          aiSuggested = Object.keys(imputed);
        } catch { imputed = {}; }
      }
    }

    const merged = { ...extracted, ...imputed };
    res.json({ text: extractedRaw, parsed: merged, aiSuggested });

  } catch (err) {
    console.error("AI extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("OpsResolve Backend Running");
});

app.get("/api/test-ai", async (req, res) => {
  try {
    const text = await callGemini("Say hello in one sentence.");
    res.json({ response: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
