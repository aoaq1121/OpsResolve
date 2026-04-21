/*
Ai controller:
1. Receives request
2. Validates input
3. Sends to workflow engine
4. Returns AI result
*/
import { runAgentLoop } from "./workflowEngine.js";

/**
 * AI Controller
 * Entry point for all AI requests from frontend
 */

export async function analyzeConflict(req, res) {
  try {
    // STEP 1: Get data from frontend
    const input = req.body;

    if (!input || !input.user_input) {
      return res.status(400).json({
        error: "Missing user_input"
      });
    }

    console.log("📥 Received request:", input);

    // STEP 2: Send to AI workflow engine
    const aiResult = await runAgentLoop(input);

    // STEP 3: Return result to frontend
    return res.status(200).json({
      success: true,
      data: aiResult
    });

  } catch (error) {
    console.error("AI Controller Error:", error);

    return res.status(500).json({
      success: false,
      error: "AI processing failed",
      message: error.message
    });
  }
}