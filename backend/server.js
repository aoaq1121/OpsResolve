require("dotenv").config();
console.log("API KEY:", process.env.ILMU_API_KEY);

const express = require("express");
const cors = require("cors");
const { aiController } = require("./controllers/aiController");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/submit-record", aiController);

app.get("/api/get-conflicts", (req, res) => {
  const mockRecords = require("./data/mockRecords");
  const conflicts = mockRecords.filter((r) => r.status === "conflict");
  res.json({ success: true, data: conflicts });
});

app.get("/", (req, res) => {
  res.send("OpsResolve Backend Running");
});

const PORT = process.env.PORT || 5000;

app.get("/api/test-ai", async (req, res) => {
  const fetch = require("node-fetch");
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});