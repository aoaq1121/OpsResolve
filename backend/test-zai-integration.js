// test-zai-integration.js
// Test script for Z.AI GLM integration with OpsResolve

const { callGLMWithZ } = require("./services/glmServices");

console.log("\n╔════════════════════════════════════════════════════════════════╗");
console.log("║        Z.AI GLM Integration Test for OpsResolve              ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

// Test Case 1: Resource Clash Scenario
const testCase1 = {
  title: "Maintenance scheduled",
  category: "Maintenance Request",
  location: "Line A",
  equipment: "CNC Machine",
  priority: "Normal",
  shift: "Morning",
  date: "2024-04-23",
  duration: "2–4 hours",
  impact: "Minor disruption",
  description: `Preventive maintenance for CNC Machine scheduled for tomorrow morning.
    However, production department also needs this machine urgently tomorrow for 
    fulfilling an urgent customer order. Need GLM to analyze the conflict and 
    recommend optimal scheduling.`,
};

// Test Case 2: Complex Multi-Department Conflict
const testCase2 = {
  title: "Equipment allocation dilemma",
  category: "Resource Allocation",
  location: "Bay 1",
  equipment: "Conveyor Belt A",
  priority: "High",
  shift: "Afternoon",
  date: "2024-04-22",
  duration: "4–8 hours",
  impact: "Partial shutdown",
  description: `Maintenance wants to upgrade Conveyor Belt A this afternoon for quality improvement.
    But production team has scheduled high-priority assembly work that needs this conveyor.
    Quality control also needs the conveyor for testing new components.
    GLM should evaluate all three department needs and recommend the best course of action.`,
};

// Test Case 3: Simple Request (No Conflict)
const testCase3 = {
  title: "Standard production log",
  category: "Production Log",
  location: "Line B",
  equipment: "Machine B-12",
  priority: "Normal",
  shift: "Morning",
  date: "2024-04-23",
  duration: "Less than 1 hour",
  impact: "No disruption",
  description: `Daily production run on Machine B-12. No conflicts expected.
    Standard operational workflow. Equipment is available and operational.`,
};

async function runTest(testName, testData) {
  console.log(`\n${"─".repeat(64)}`);
  console.log(`Test: ${testName}`);
  console.log(`${"─".repeat(64)}\n`);

  try {
    console.log("📤 Sending request to Z.AI GLM...\n");
    const startTime = Date.now();

    const result = await callGLMWithZ("unifiedAgent", testData);
    const duration = Date.now() - startTime;

    console.log(`⏱️  Processing time: ${duration}ms\n`);

    if (result.error) {
      console.error("❌ ERROR:", result.error);
      if (result.status) {
        console.error("Status:", result.status);
      }
      if (result.suggestion) {
        console.error("Suggestion:", result.suggestion);
      }
      return false;
    }

    if (!result.success) {
      console.error("❌ Request failed (success=false)");
      return false;
    }

    const data = result.data;

    // Stage 1: Input Understanding
    console.log("🟢 STAGE 1: Input Understanding");
    console.log("─".repeat(40));
    if (data.stage1_understanding?.extracted_fields) {
      const fields = data.stage1_understanding.extracted_fields;
      console.log(`  Equipment: ${fields.equipment}`);
      console.log(`  Location: ${fields.location}`);
      console.log(`  Priority: ${fields.priority}`);
      console.log(`  Impact: ${fields.impact}`);
    }

    // Stage 2: Conflict Detection
    console.log("\n🟡 STAGE 2: Conflict Detection");
    console.log("─".repeat(40));
    if (data.stage2_conflict_detection) {
      const conflict = data.stage2_conflict_detection;
      console.log(`  Conflict Detected: ${conflict.conflict ? "YES ⚠️" : "NO ✓"}`);
      if (conflict.conflict) {
        console.log(`  Type: ${conflict.conflict_type}`);
        console.log(`  Severity: ${conflict.severity}`);
        console.log(`  Reason: ${conflict.reasoning}`);
      }
    }

    // Stage 3: Impact Analysis
    console.log("\n🟠 STAGE 3: Impact Analysis");
    console.log("─".repeat(40));
    if (data.stage3_impact_analysis) {
      const impact = data.stage3_impact_analysis;
      console.log(`  Impact Level: ${impact.impact_level}`);
      console.log(`  Root Cause: ${impact.root_cause}`);
      console.log(`  Business Impact: ${impact.business_impact}`);
      console.log(`  Risk Level: ${impact.risk_level}`);
    }

    // Stage 4: Decision & Recommendation
    console.log("\n🔴 STAGE 4: Decision & Recommendation");
    console.log("─".repeat(40));
    if (data.stage4_decision) {
      const decision = data.stage4_decision;
      console.log(`  Recommendation: ${decision.recommendation}`);
      console.log(`  Action Type: ${decision.action_type}`);
      console.log(`  Confidence: ${decision.confidence || "N/A"}%`);
      console.log(`  Escalation Needed: ${decision.escalation_needed ? "YES" : "NO"}`);
      if (decision.alternatives && decision.alternatives.length > 0) {
        console.log(`  Alternatives:`);
        decision.alternatives.forEach((alt) => {
          console.log(`    • ${alt}`);
        });
      }
    }

    console.log("\n✅ Test passed\n");
    return true;
  } catch (err) {
    console.error("❌ Test failed with error:", err.message);
    console.error("Stack:", err.stack);
    return false;
  }
}

async function main() {
  // Check API key
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) {
    console.error("❌ ERROR: ZAI_API_KEY environment variable not set");
    console.error("   Set it with: export ZAI_API_KEY=sk_xxxxxxxxxxxxxxxxxxxx");
    process.exit(1);
  }

  console.log("✅ API Key configured\n");

  // Run tests
  const tests = [
    {
      name: "Resource Clash Scenario",
      data: testCase1,
    },
    {
      name: "Complex Multi-Department Conflict",
      data: testCase2,
    },
    {
      name: "Simple Request (No Conflict)",
      data: testCase3,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await runTest(test.name, test.data);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  // Summary
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log(`║                      TEST SUMMARY                             ║`);
  console.log("╠════════════════════════════════════════════════════════════════╣");
  console.log(`║  Passed: ${passed}/${tests.length}`.padEnd(62) + "║");
  console.log(`║  Failed: ${failed}/${tests.length}`.padEnd(62) + "║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  if (failed === 0) {
    console.log("🎉 All tests passed! Z.AI GLM integration is working correctly.\n");
    process.exit(0);
  } else {
    console.error(
      `❌ ${failed} test(s) failed. Check error messages above.\n`
    );
    process.exit(1);
  }
}

main();
