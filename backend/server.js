require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { aiController } = require("./controllers/aiController");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.post("/api/submit-record", aiController);

// ── Helper: call ilmu.ai ──────────────────────────────────────────────────────
async function callAI(prompt) {
  await new Promise(r => setTimeout(r, 1000));
  console.log("Sending prompt length:", prompt.length, "chars");
  console.log("Prompt preview:", prompt.substring(0, 200));
  const response = await fetch("https://api.ilmu.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.ILMU_API_KEY}`,
    },
    body: JSON.stringify({
      model: "ilmu-glm-5.1",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const rawText = await response.text();
  let data;
  try { data = JSON.parse(rawText); } catch {
    throw new Error("ilmu.ai invalid response: " + rawText.substring(0, 100));
  }
  return data.choices?.[0]?.message?.content || "";
}

// ── Helper: extract PDF text ──────────────────────────────────────────────────
async function extractPdfText(base64) {
  const PDFParser = require("pdf2json");
  const buffer = Buffer.from(base64, "base64");
  return new Promise((resolve) => {
    const parser = new PDFParser(null, 1);
    parser.on("pdfParser_dataReady", (data) => {
      try {
        const text = data.Pages.map(page =>
          page.Texts.map(t => decodeURIComponent(t.R.map(r => r.T).join(""))).join(" ")
        ).join("\n");
        console.log("Extracted PDF text:", text.substring(0, 300));
        resolve(text.substring(0, 800));
      } catch { resolve("[Could not parse PDF]"); }
    });
    parser.on("pdfParser_dataError", () => resolve("[PDF parse error]"));
    parser.parseBuffer(buffer);
  });
}

// ── AI Extract + Impute ───────────────────────────────────────────────────────
// Step 1: Extract fields from PDF/text
// Step 2: For missing fields, fetch past records and impute based on history
app.post("/api/ai-extract", async (req, res) => {
  try {
    const { prompt, file, department, pastRecords } = req.body;

    let fullPrompt = prompt;

    // Extract text from PDF if provided
    if (file && file.mediaType === "application/pdf") {
      const pdfText = await extractPdfText(file.base64);
      fullPrompt = `${prompt}\n\nText: ${pdfText.substring(0, 600)}`;
    }

    // Step 1: Extract what's in the document
    const extractedRaw = await callAI(fullPrompt);
    const extractedClean = extractedRaw.replace(/```json|```/g, "").trim();
    let extracted = null;
    try { extracted = JSON.parse(extractedClean); } catch { extracted = {}; }

    console.log("Step 1 extracted:", JSON.stringify(extracted));

    // Step 2: Impute missing fields from past records if provided
    let imputed = {};
    let aiSuggested = [];

    if (pastRecords && pastRecords.length > 0 && extracted) {
      const missingFields = Object.entries(extracted)
        .filter(([, v]) => v === null || v === undefined || v === "")
        .map(([k]) => k);

      if (missingFields.length > 0) {
        const historyStr = pastRecords
          .slice(0, 5)
          .map((r, i) => `Record ${i + 1}: ${JSON.stringify(r)}`)
          .join("\n");

        const imputePrompt = `Based on these past ${department} records:\n${historyStr}\n\nThe current form has these missing fields: ${missingFields.join(", ")}.\nThe current form data is: ${JSON.stringify(extracted)}.\n\nSuggest values for the missing fields based on patterns in the past records. Return ONLY JSON with just the missing fields and their suggested values. No explanation.`;

        const imputedRaw = await callAI(imputePrompt);
        const imputedClean = imputedRaw.replace(/```json|```/g, "").trim();
        try {
          imputed = JSON.parse(imputedClean);
          aiSuggested = Object.keys(imputed);
          console.log("Step 2 imputed:", JSON.stringify(imputed));
        } catch { imputed = {}; }
      }
    }

    // Merge extracted + imputed
    const merged = { ...extracted, ...imputed };

    res.json({
      text: extractedRaw,
      parsed: merged,
      aiSuggested, // list of field names that were AI-suggested from history
    });

  } catch (err) {
    console.error("AI extract error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("OpsResolve Backend Running");
});

app.get("/api/test-ai", async (req, res) => {
  const response = await fetch("https://api.ilmu.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ILMU_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "ilmu-glm-5.1",
      messages: [{ role: "user", content: "say hi" }],
    }),
  });
  const raw = await response.json();
  res.json(raw);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
