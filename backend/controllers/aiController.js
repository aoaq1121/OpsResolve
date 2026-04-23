const { runAgentLoop } = require("../services/runAgentLoop");
const mockRecords = require("../data/mockRecords");

function detectConflict(record) {
  const match = mockRecords.find((item) => {
    if (item.status === "closed") return false;
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

    const conflictMatch = detectConflict(record);
    const result = await runAgentLoop(record, conflictMatch);

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
