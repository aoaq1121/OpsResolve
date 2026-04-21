// controllers/aiController.js
const { processRecordWorkflow } = require("../services/workflowEngine");
const mockRecords = require("../data/mockRecords");

function detectConflict(record) {
  return mockRecords.find((item) => {
    const sameEquipment =
      item.equipment && record.equipment && item.equipment === record.equipment;

    const sameLocation =
      item.location && record.location && item.location === record.location;

    const sameShift =
      item.shift && record.shift && item.shift === record.shift;

    const differentDepartment =
      item.department && record.department && item.department !== record.department;

    return (
      item.status !== "closed" &&
      differentDepartment &&
      (sameEquipment || sameLocation || sameShift)
    );
  }) || null;
}

const aiController = async (req, res) => {
  try {
    const record = req.body;

    if (!record.title || !record.category || !record.description) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const conflictMatch = detectConflict(record);
    const result = processRecordWorkflow(record, conflictMatch);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("AI Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { aiController };