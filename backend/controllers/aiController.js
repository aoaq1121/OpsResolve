const fetch = require("node-fetch");
const { runAgentLoop } = require("../services/runAgentLoop");
const { callGLM } = require("../services/glmServices");

// ── FILE PROCESSING HELPERS ────────────────────────────────────────────────
async function processUploadedFiles(files) {
  if (!files || files.length === 0) {
    console.log("ℹ️ No files to process");
    return "";
  }

  console.log("📸 Processing", files.length, "uploaded files with AI...");
  let enrichedContext = "";

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`  File ${i + 1}:`, file.originalname, `(${file.size} bytes)`);

    try {
      const fileBase64 = file.buffer.toString("base64");
      const dataUri = `data:${file.mimetype};base64,${fileBase64}`;

      if (file.mimetype === "application/pdf") {
        // Analyze PDF with documentAnalyzer
        console.log(`    🤖 Analyzing PDF with AI...`);
        const pdfAnalysis = await callGLM("documentAnalyzer", {
          documentType: "PDF Report",
          filename: file.originalname,
          content: dataUri,
        });

        if (!pdfAnalysis.error) {
          enrichedContext += `\n\n[PDF Analysis: ${file.originalname}]\n`;
          enrichedContext += `Title: ${pdfAnalysis.extractedTitle || "Unknown"}\n`;
          enrichedContext += `Category: ${pdfAnalysis.extractedCategory || "Unknown"}\n`;
          enrichedContext += `Location: ${pdfAnalysis.extractedLocation || "Not specified"}\n`;
          enrichedContext += `Equipment: ${pdfAnalysis.extractedEquipment || "Not specified"}\n`;
          enrichedContext += `Issues: ${pdfAnalysis.extractedIssues?.join(", ") || "None identified"}\n`;
          enrichedContext += `Impact: ${pdfAnalysis.extractedImpact || "Unknown"}\n`;
          enrichedContext += `Summary: ${pdfAnalysis.documentSummary || "Analysis not available"}\n`;
          console.log(`    ✅ PDF analyzed successfully`);
        }
      } else if (file.mimetype.startsWith("image/")) {
        // Analyze image with imageAnalyzer
        console.log(`    🤖 Analyzing image with AI...`);
        const imageAnalysis = await callGLM("imageAnalyzer", {
          imageType: "Operational Photo",
          filename: file.originalname,
          content: dataUri,
        });

        if (!imageAnalysis.error) {
          enrichedContext += `\n\n[Image Analysis: ${file.originalname}]\n`;
          enrichedContext += `Description: ${imageAnalysis.imageDescription || "Unable to analyze"}\n`;
          enrichedContext += `Equipment: ${imageAnalysis.identifiedEquipment || "Not identified"}\n`;
          enrichedContext += `Location: ${imageAnalysis.identifiedLocation || "Not specified"}\n`;
          enrichedContext += `Problems Identified: ${imageAnalysis.identifiedProblems?.join(", ") || "None visible"}\n`;
          enrichedContext += `Severity: ${imageAnalysis.estimatedSeverity || "Unknown"}\n`;
          enrichedContext += `Readable Text: ${imageAnalysis.readableText || "None"}\n`;
          enrichedContext += `Summary: ${imageAnalysis.imageSummary || "Visual analysis not available"}\n`;
          console.log(`    ✅ Image analyzed successfully`);
        }
      }
    } catch (err) {
      console.error(`    ❌ Error analyzing file:`, err.message);
      enrichedContext += `\n[File: ${file.originalname} - Analysis failed]\n`;
    }
  }

  return enrichedContext;
}

// ── HELPER FUNCTIONS FOR FALLBACK PARSING ──────────────────────────────────
function extractTitle(text) {
  const firstSentence = text.split(/[.!?]/)[0].trim();
  return firstSentence.substring(0, 80) || "Operational Request";
}

function extractCategory(text) {
  const lower = text.toLowerCase();
  if (lower.includes("machine") || lower.includes("equipment") || lower.includes("fault"))
    return "Equipment Fault";
  if (lower.includes("maintenance") || lower.includes("repair") || lower.includes("fix"))
    return "Maintenance Request";
  if (lower.includes("incident") || lower.includes("accident") || lower.includes("issue"))
    return "Incident Report";
  if (lower.includes("quality") || lower.includes("check") || lower.includes("inspect"))
    return "Quality Check";
  if (lower.includes("production") || lower.includes("output"))
    return "Production Log";
  if (lower.includes("schedule") || lower.includes("timing"))
    return "Schedule Change";
  if (lower.includes("resource") || lower.includes("allocation"))
    return "Resource Allocation";
  return "Maintenance Request";
}

function extractLocation(text) {
  const locations = [
    "Line A", "Line B", "Line C",
    "Bay 1", "Bay 2", "Bay 3",
    "Warehouse", "Loading Dock", "Control Room",
    "Packaging Area", "QC Lab"
  ];
  for (const loc of locations) {
    if (text.toLowerCase().includes(loc.toLowerCase())) return loc;
  }
  return "";
}

function extractEquipment(text) {
  const equipment = [
    "Machine M-01", "Machine M-07", "Machine M-12",
    "Conveyor Belt A", "Conveyor Belt B",
    "Forklift F-01", "Forklift F-03",
    "QC Station 1", "QC Station 2",
    "Air Compressor AC-01", "Generator G-02",
    "Packaging Robot PR-01"
  ];
  for (const eq of equipment) {
    if (text.includes(eq)) return eq;
  }
  // Try to match shortened versions
  if (text.includes("M-07") || text.includes("M07")) return "Machine M-07";
  if (text.includes("M-01") || text.includes("M01")) return "Machine M-01";
  if (text.includes("M-12") || text.includes("M12")) return "Machine M-12";
  return "";
}

function extractPriority(text) {
  const lower = text.toLowerCase();
  if (lower.includes("critical") || lower.includes("urgent") || lower.includes("emergency"))
    return "Critical";
  if (lower.includes("high") || lower.includes("important"))
    return "High";
  return "Normal";
}

function extractShift(text) {
  const lower = text.toLowerCase();
  if (lower.includes("morning") || lower.includes("am")) return "Morning";
  if (lower.includes("afternoon") || lower.includes("pm")) return "Afternoon";
  if (lower.includes("night") || lower.includes("evening") || lower.includes("late"))
    return "Night";
  return "Morning";
}

async function getExistingRecords() {
  try {
    const response = await fetch("http://localhost:3001/api/records");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to fetch records from Firebase:", err.message);
    return [];
  }
}

function detectConflict(record, existingRecords) {
  const match = existingRecords.find((item) => {
    if (item.status === "closed" || item.status === "resolved") return false;
    if (!item.department || !record.department) return false;
    if (item.department === record.department) return false;

    const sameEquipment = item.equipment && record.equipment && item.equipment === record.equipment;
    const sameLocation = item.location && record.location && item.location === record.location;
    const sameShift = item.shift && record.shift && item.shift === record.shift;

    return sameEquipment || sameLocation || sameShift;
  });

  return match || null;
}

// ── NEW: Analyze free-form text input with AI ──────────────────────────────────
const analyzeInputController = async (req, res) => {
  try {
    const { description, department } = req.body;
    const files = req.files || []; // Files from multer

    console.log("📥 Received analyze-input request:", { description: description?.substring(0, 50), department, filesCount: files.length });

    if (!description || !description.trim()) {
      console.log("❌ Error: Description is required or empty");
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    // Process uploaded files
    let fileContext = await processUploadedFiles(files);
    const fullInput = description + fileContext;

    // ═══════════════════════════════════════════════════════════════════════════════
    // PHASE 1: INPUT AGENT - Parse structured fields
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log("🤖 [1/4] Calling INPUT Agent...");
    const inputResult = await callGLM("inputAgent", {
      input: fullInput,
      department,
    });

    console.log("📊 INPUT Agent Response:", inputResult);

    // Use fallback if inputAgent fails
    let parsedInput = inputResult;
    if (inputResult.error || !inputResult.title) {
      console.log("⚠️ INPUT Agent failed, using fallback parsing...");
      parsedInput = {
        title: extractTitle(fullInput),
        category: extractCategory(fullInput),
        location: extractLocation(fullInput),
        equipment: extractEquipment(fullInput),
        priority: extractPriority(fullInput),
        shift: extractShift(fullInput),
        date: "",
        duration: "",
        impact: "",
        description: description,
      };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // PHASE 2: IMPACT AGENT - Analyze operational impact
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log("🤖 [2/4] Calling IMPACT Agent...");
    const impactResult = await callGLM("impactAgent", {
      title: parsedInput.title,
      category: parsedInput.category,
      location: parsedInput.location,
      equipment: parsedInput.equipment,
      description: fullInput,
      department,
    });

    console.log("📊 IMPACT Agent Response:", impactResult);

    // Default impact if agent fails
    const impact = impactResult.error ? {
      impactLevel: "Minor disruption",
      reason: "Unable to determine from description",
      riskNotes: "Requires manual review",
    } : impactResult;

    // ═══════════════════════════════════════════════════════════════════════════════
    // PHASE 3: CONFLICT AGENT - Detect conflicts with other departments
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log("🤖 [3/4] Calling CONFLICT Agent...");
    const conflictResult = await callGLM("conflictAgent", {
      newRecord: parsedInput,
      department,
      description: fullInput,
    });

    console.log("📊 CONFLICT Agent Response:", conflictResult);

    // Default conflict if agent fails
    const conflict = conflictResult.error ? {
      conflict: false,
      conflictReason: null,
      severity: "Low",
    } : conflictResult;

    // ═══════════════════════════════════════════════════════════════════════════════
    // PHASE 4: DECISION AGENT - Recommend action
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log("🤖 [4/4] Calling DECISION Agent...");
    const decisionResult = await callGLM("decisionAgent", {
      input: parsedInput,
      impact: impact,
      conflict: conflict,
      department,
    });

    console.log("📊 DECISION Agent Response:", decisionResult);

    // Default decision if agent fails
    const decision = decisionResult.error ? {
      actionType: "Review",
      recommendation: "Review the record manually before proceeding",
      confidence: 50,
      escalationNeeded: false,
    } : decisionResult;

    // ═══════════════════════════════════════════════════════════════════════════════
    // RETURN: Combined analysis from all agents
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log("✅ All agents completed successfully");
    return res.status(200).json({
      success: true,
      aiAnalysis: {
        // INPUT AGENT RESULTS
        title: parsedInput.title || "Operational Request",
        category: parsedInput.category || "Maintenance Request",
        location: parsedInput.location || "",
        equipment: parsedInput.equipment || "",
        priority: parsedInput.priority || "Normal",
        shift: parsedInput.shift || "Morning",
        date: parsedInput.date || "",
        duration: parsedInput.duration || "",
        description: description,

        // IMPACT AGENT RESULTS
        impact: {
          level: impact.impactLevel || "Minor disruption",
          reason: impact.reason || "Analysis required",
          riskNotes: impact.riskNotes || "",
        },

        // CONFLICT AGENT RESULTS
        conflict: {
          detected: conflict.conflict || false,
          reason: conflict.conflictReason || null,
          severity: conflict.severity || "Low",
          matchedRecordId: conflict.matchedRecordId || null,
        },

        // DECISION AGENT RESULTS
        decision: {
          actionType: decision.actionType || "Review",
          recommendation: decision.recommendation || "Manual review needed",
          confidence: decision.confidence || 0,
          escalationNeeded: decision.escalationNeeded || false,
        },
      },
    });
  } catch (error) {
    console.error("❌ Input analysis error:", error.message);
    console.error("Stack:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during AI analysis",
      debug: error.message,
    });
  }
};

const aiController = async (req, res) => {
  try {
    const record = req.body;

    if (!record.title || !record.category || !record.description) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, category, description",
      });
    }

    const existingRecords = await getExistingRecords();
    const conflictMatch = detectConflict(record, existingRecords);
    const result = await runAgentLoop(record, conflictMatch);

    // Save new record to Firebase
    try {
      await fetch("http://localhost:3001/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
    } catch (saveErr) {
      console.error("Failed to save record to Firebase:", saveErr.message);
    }

    // Save conflict to Firebase if conflict detected
    if (result.conflict && conflictMatch) {
      try {
        const conflictData = {
          recordA: conflictMatch.id || conflictMatch.recordId || "unknown",
          recordB: record.title,
          departmentsInvolved: [conflictMatch.department, record.department].filter(Boolean),
          conflictReason: result.aiSummary?.conflictReason || result.context?.reason || "Resource or schedule overlap detected",
          severity: result.severity || "Medium",
          status: "active",
          statusType: "urgent",
          aiSummary: result.aiSummary?.conflictReason || "",
          recommendation: result.aiSummary?.recommendation || "",
          confidence: result.aiSummary?.impact ? 80 : 60,
          reportedAt: new Date().toISOString(),
          first_detected: new Date().toISOString(),
          last_detected: new Date().toISOString(),
          count: 1,
        };

        await fetch("http://localhost:3001/api/conflicts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(conflictData),
        });
      } catch (conflictErr) {
        console.error("Failed to save conflict to Firebase:", conflictErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Controller error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { aiController, analyzeInputController };
