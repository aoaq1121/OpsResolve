import { callGLM } from "./glmService.js";

export async function runAgentLoop(input) {

  // STEP 1: THINK (extract info)
  const extracted = await callGLM("inputAgent", input);

  // STEP 2: CHECK completeness
  if (!extracted.resource || !extracted.time) {
    return {
      status: "NEED_MORE_INFO",
      missing: ["resource", "time"]
    };
  }

  // STEP 3: THINK (detect conflict)
  const conflict = await callGLM("conflictAgent", extracted);

  if (!conflict.conflict) {
    return { status: "NO_CONFLICT" };
  }

  // STEP 4: THINK (impact)
  const impact = await callGLM("impactAgent", conflict);

  // STEP 5: THINK (decision)
  const decision = await callGLM("decisionAgent", impact);

  return {
    conflict,
    impact,
    decision
  };
}