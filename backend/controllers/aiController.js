const fetch = require("node-fetch");
const { runAgentLoop } = require("../services/runAgentLoop");

async function getExistingRecords() {
  try {
    const response = await fetch("http://localhost:3001/api/records");
    const data = await response.json();
    const records = Array.isArray(data) ? data : data.data || [];
    console.log("Records fetched:", records.map(r => ({ id: r.id, title: r.title, equipment: r.equipment, shift: r.shift, date: r.date, department: r.department })));
    return records;
  } catch (err) {
    console.error("Failed to fetch records:", err.message);
    return [];
  }
}

function detectConflict(record, existingRecords) {
  const match = existingRecords.find((item) => {
    if (item.status === "closed" || item.status === "resolved") return false;
    if (!item.department || !record.department) return false;

    // Don't match itself
    if (item.title === record.title && item.date === record.date && item.department === record.department) return false;

    const sameEquipment = item.equipment && record.equipment &&
      item.equipment.toLowerCase() === record.equipment.toLowerCase();
    const sameLocation = item.location && record.location &&
      item.location.toLowerCase() === record.location.toLowerCase();
    const sameShift = item.shift && record.shift &&
      item.shift.toLowerCase() === record.shift.toLowerCase();
    const sameDate = item.date && record.date && item.date === record.date;
    const sameDept = item.department === record.department;
    const diffDept = item.department !== record.department;

    // Cross-department: same equipment OR same location+shift+date
    const crossDeptConflict = diffDept && (sameEquipment || (sameLocation && sameShift && sameDate));

    // Same department: same equipment + same shift + same date
    const sameDeptConflict = sameDept && sameEquipment && sameShift && sameDate;

    console.log(`Comparing with ${item.title}: sameEquip=${sameEquipment} sameShift=${sameShift} sameDate=${sameDate} sameDept=${sameDept} → cross=${crossDeptConflict} same=${sameDeptConflict}`);

    return crossDeptConflict || sameDeptConflict;
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
    console.log("Conflict match found:", conflictMatch ? conflictMatch.title : "none");

    const result = await runAgentLoop(record, conflictMatch);

    // Save new record to Firebase
    try {
      await fetch("http://localhost:3001/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
    } catch (saveErr) {
      console.error("Failed to save record:", saveErr.message);
    }

    // Save conflict to Firebase if detected
    if (result.conflict && conflictMatch) {
      try {
        // Calculate confidence based on match strength
        const sameEquip = conflictMatch.equipment && record.equipment &&
          conflictMatch.equipment.toLowerCase() === record.equipment.toLowerCase();
        const sameShift = conflictMatch.shift && record.shift &&
          conflictMatch.shift.toLowerCase() === record.shift.toLowerCase();
        const sameDate = conflictMatch.date && record.date && conflictMatch.date === record.date;
        const sameLoc = conflictMatch.location && record.location &&
          conflictMatch.location.toLowerCase() === record.location.toLowerCase();
        let confidence = 60;
        if (sameEquip) confidence += 15;
        if (sameShift) confidence += 10;
        if (sameDate) confidence += 10;
        if (sameLoc) confidence += 5;
        confidence = Math.min(confidence, 98);

        const conflictData = {
          recordA: conflictMatch.id || conflictMatch.recordId || "unknown",
          recordB: record.title,
          departmentsInvolved: [conflictMatch.department, record.department].filter(Boolean),
          conflictReason: result.aiSummary?.conflictReason || "Resource or schedule overlap detected",
          severity: result.severity || "Medium",
          status: "active",
          statusType: "urgent",
          aiSummary: result.aiSummary || "",
          recommendation: result.aiSummary?.recommendation || "",
          confidence,
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
        console.error("Failed to save conflict:", conflictErr.message);
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
