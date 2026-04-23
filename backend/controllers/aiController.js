const fetch = require("node-fetch");
const { runAgentLoop } = require("../services/runAgentLoop");

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

module.exports = { aiController };
