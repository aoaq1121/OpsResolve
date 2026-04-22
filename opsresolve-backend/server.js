const express = require('express');
const cors = require('cors');
const stateManager = require('./services/stateManager');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ========== HEALTH CHECK ==========
app.get('/', (req, res) => {
  res.json({ message: 'OpsResolve State Management Server is running!' });
});

// ========== RECORD ENDPOINTS ==========

// POST - Save a new record (called by Person 2)
app.post('/api/records', async (req, res) => {
  try {
    const record = await stateManager.saveRecord(req.body);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - All records
app.get('/api/records', async (req, res) => {
  try {
    const records = await stateManager.getAllRecords();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH - Update record status
app.patch('/api/records/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await stateManager.updateRecordStatus(req.params.id, status);
    res.json({ success: true, status: status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== CONFLICT ENDPOINTS ==========

// POST - Save a conflict (called by Person 2 after AI detection)
app.post('/api/conflicts', async (req, res) => {
  try {
    const conflict = await stateManager.saveConflict(req.body);
    res.status(201).json(conflict);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - All active conflicts (for Person 3)
app.get('/api/conflicts', async (req, res) => {
  try {
    const conflicts = await stateManager.getAllActiveConflicts();
    res.json(conflicts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Single conflict by ID
app.get('/api/conflicts/:id', async (req, res) => {
  try {
    const conflict = await stateManager.getConflictById(req.params.id);
    if (!conflict) {
      return res.status(404).json({ error: 'Conflict not found' });
    }
    res.json(conflict);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Recurring conflicts (count >= 2)
app.get('/api/conflicts/recurring', async (req, res) => {
  try {
    const conflicts = await stateManager.getRecurringConflicts(2);
    res.json(conflicts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== DECISION ENDPOINTS ==========

// POST - Save a decision (called by Person 4)
app.post('/api/decisions', async (req, res) => {
  try {
    const decision = await stateManager.saveDecision(req.body);
    res.status(201).json(decision);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - All decisions
app.get('/api/decisions', async (req, res) => {
  try {
    const decisions = await stateManager.getAllDecisions();
    res.json(decisions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== STATISTICS ENDPOINT ==========

app.get('/api/statistics', async (req, res) => {
  try {
    const stats = await stateManager.getStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== DEMO DATA ==========

app.post('/api/seed-demo', async (req, res) => {
  try {
    await stateManager.seedDemoData();
    res.json({ message: 'Demo data seeded successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   OpsResolve State Management         ║
  ║   Server running on port ${PORT}        ║
  ║   http://localhost:${PORT}              ║
  ╚═══════════════════════════════════════╝
  `);
});