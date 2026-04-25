require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { aiController } = require("./controllers/aiController");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.post("/api/submit-record", aiController);

// ── Gemini helper ─────────────────────────────────────────────────────────────
async function callGemini(prompt, file = null, maxTokens = 1000) {
  const key = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const parts = [];
  if (file) parts.push({ inline_data: { mime_type: file.mediaType, data: file.base64 } });
  parts.push({ text: prompt });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ── AI Extract endpoint ───────────────────────────────────────────────────────
app.post("/api/ai-extract", async (req, res) => {
  try {
    const { prompt, file, department, pastRecords } = req.body;

    // Build history context for imputation
    let historyContext = "";
    if (pastRecords && pastRecords.length > 0) {
      const historyStr = pastRecords.slice(0, 3).map((r, i) =>
        `Record ${i + 1}: ${JSON.stringify({
          processType: r.processType, location: r.location, equipment: r.equipment,
          shift: r.shift, duration: r.duration, maintenanceType: r.maintenanceType,
          estimatedDowntime: r.estimatedDowntime, spareParts: r.spareParts,
          inspectionType: r.inspectionType, sampleSize: r.sampleSize, qcStation: r.qcStation,
        })}`
      ).join("\n");
      historyContext = `\n\nPast ${department} records for reference — use these to fill any missing fields:\n${historyStr}`;
    }

    const combinedPrompt = `${prompt}${historyContext}`;
    console.log("Calling Gemini, prompt length:", combinedPrompt.length);

    const raw = await callGemini(combinedPrompt, file || null, 1000);
    console.log("Gemini response:", raw.substring(0, 300));

    // Parse JSON
    let extracted = {};
    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      extracted = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] || clean);
    } catch { extracted = {}; }
    console.log("Extracted:", JSON.stringify(extracted));

    // Identify AI-suggested fields (fields with values that were likely missing from doc)
    const aiSuggested = [];
    if (pastRecords && pastRecords.length > 0 && extracted) {
      ["duration", "estimatedDowntime", "spareParts", "sampleSize", "qcStation"].forEach(f => {
        if (extracted[f]) aiSuggested.push(f);
      });
    }

    res.json({ text: raw, parsed: extracted, aiSuggested });

  } catch (err) {
    console.error("AI extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => res.send("OpsResolve Backend Running"));

app.get("/api/test-ai", async (req, res) => {
  try {
    const text = await callGemini("Say hello in one sentence.");
    res.json({ response: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
