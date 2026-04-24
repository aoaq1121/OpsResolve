const express = require('express');
const cors = require('cors');
const stateManager = require('./services/stateManager');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'OpsResolve State Management Server is running!' });
});

// ── Records ──────────────────────────────────────────────────────────────────
app.post('/api/records', async (req, res) => {
  try {
    const record = await stateManager.saveRecord(req.body);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/records', async (req, res) => {
  try {
    const records = await stateManager.getAllRecords();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/records/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await stateManager.updateRecordStatus(req.params.id, status);
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Conflicts ────────────────────────────────────────────────────────────────
app.post('/api/conflicts', async (req, res) => {
  try {
    const conflict = await stateManager.saveConflict(req.body);
    res.status(201).json(conflict);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/conflicts', async (req, res) => {
  try {
    const conflicts = await stateManager.getAllActiveConflicts();
    res.json(conflicts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/conflicts/recurring', async (req, res) => {
  try {
    const conflicts = await stateManager.getRecurringConflicts(2);
    res.json(conflicts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/conflicts/:id', async (req, res) => {
  try {
    const conflict = await stateManager.getConflictById(req.params.id);
    if (!conflict) return res.status(404).json({ error: 'Conflict not found' });
    res.json(conflict);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── NEW: Update conflict status (notified, scheduled, etc.) ──────────────────
app.patch('/api/conflicts/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await stateManager.updateConflictStatus(req.params.id, status);
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Decisions ────────────────────────────────────────────────────────────────
app.post('/api/decisions', async (req, res) => {
  try {
    const decision = await stateManager.saveDecision(req.body);
    res.status(201).json(decision);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/decisions', async (req, res) => {
  try {
    const decisions = await stateManager.getAllDecisions();
    res.json(decisions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Announcements ────────────────────────────────────────────────────────────
app.post('/api/announcements', async (req, res) => {
  try {
    const announcement = await stateManager.saveAnnouncement(req.body);
    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Reviews ──────────────────────────────────────────────────────────────────
app.post('/api/reviews', async (req, res) => {
  try {
    const review = await stateManager.saveReview(req.body);
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await stateManager.getAllReviews();
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Statistics ───────────────────────────────────────────────────────────────
app.get('/api/statistics', async (req, res) => {
  try {
    const stats = await stateManager.getStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Demo seed ────────────────────────────────────────────────────────────────
app.post('/api/seed-demo', async (req, res) => {
  try {
    await stateManager.seedDemoData();
    res.json({ message: 'Demo data seeded successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`OpsResolve State Management Server running on port ${PORT}`);
});
