const { db } = require('../config/firebase');

class StateManager {

  // ─── Records ────────────────────────────────────────────────────────────────

  async saveRecord(recordData) {
    const record = {
      ...recordData,
      id: `record_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: recordData.status || 'pending',
    };
    const docRef = await db.collection('records').add(record);
    return { id: docRef.id, ...record };
  }

  async getAllRecords() {
    const snapshot = await db.collection('records').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async updateRecordStatus(id, status) {
    const snapshot = await db.collection('records').where('id', '==', id).get();
    if (snapshot.empty) throw new Error('Record not found');
    await snapshot.docs[0].ref.update({ status });
  }

  // ─── Conflicts ──────────────────────────────────────────────────────────────

  async saveConflict(conflictData) {
    // Check for existing conflict between same records
    const existing = await db.collection('conflicts')
      .where('recordA', '==', conflictData.recordA)
      .where('recordB', '==', conflictData.recordB)
      .get();

    let count = 1;
    if (!existing.empty) {
      count = (existing.docs[0].data().count || 1) + 1;
      await existing.docs[0].ref.update({
        count,
        last_detected: new Date().toISOString(),
        status: conflictData.status || 'pending',
      });
      return { id: existing.docs[0].id, ...existing.docs[0].data(), count };
    }

    const conflict = {
      ...conflictData,
      conflictId: `conflict_${Date.now()}`,
      count: 1,
      first_detected: new Date().toISOString(),
      last_detected: new Date().toISOString(),
      status: conflictData.status || 'pending',
      statusType: 'urgent',
    };
    const docRef = await db.collection('conflicts').add(conflict);
    return { id: docRef.id, ...conflict };
  }

  async getAllActiveConflicts() {
    const snapshot = await db.collection('conflicts')
      .where('status', '!=', 'resolved')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getConflictById(id) {
    const snapshot = await db.collection('conflicts').where('conflictId', '==', id).get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  async getRecurringConflicts(minCount = 2) {
    const snapshot = await db.collection('conflicts')
      .where('count', '>=', minCount)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async updateConflictStatus(conflictId, status) {
    const snapshot = await db.collection('conflicts').where('conflictId', '==', conflictId).get();
    if (snapshot.empty) throw new Error('Conflict not found');
    await snapshot.docs[0].ref.update({ status });
  }

  // ─── Decisions ──────────────────────────────────────────────────────────────

  async saveDecision(decisionData) {
    const decision = {
      ...decisionData,
      decisionId: `decision_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    const docRef = await db.collection('decisions').add(decision);

    // Update conflict status after decision
    if (decisionData.conflictId) {
      await this.updateConflictStatus(
        decisionData.conflictId,
        decisionData.managerAction === 'accepted' || decisionData.managerAction === 'overridden'
          ? 'resolved'
          : 'pending'
      );
    }

    return { id: docRef.id, ...decision };
  }

  async getAllDecisions() {
    const snapshot = await db.collection('decisions').orderBy('timestamp', 'desc').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  // ─── Reviews ────────────────────────────────────────────────────────────────

  async saveReview(reviewData) {
    const review = {
      ...reviewData,
      reviewId: `review_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    const docRef = await db.collection('reviews').add(review);
    return { id: docRef.id, ...review };
  }

  async getAllReviews() {
    const snapshot = await db.collection('reviews').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  // ─── Statistics ─────────────────────────────────────────────────────────────

  async getStatistics() {
    const [records, conflicts, decisions] = await Promise.all([
      db.collection('records').get(),
      db.collection('conflicts').get(),
      db.collection('decisions').get(),
    ]);

    const resolvedConflicts = conflicts.docs.filter(
      (d) => d.data().status === 'resolved'
    ).length;

    const acceptedDecisions = decisions.docs.filter(
      (d) => d.data().managerAction === 'accepted'
    ).length;

    const overriddenDecisions = decisions.docs.filter(
      (d) => d.data().managerAction === 'overridden'
    ).length;

    return {
      totalRecords: records.size,
      totalConflicts: conflicts.size,
      resolvedConflicts,
      openConflicts: conflicts.size - resolvedConflicts,
      totalDecisions: decisions.size,
      acceptedDecisions,
      overriddenDecisions,
    };
  }

  // ─── Demo seed data ─────────────────────────────────────────────────────────

  async seedDemoData() {
    const demoConflict = {
      conflictId: `conflict_demo_${Date.now()}`,
      recordA: 'REC-001',
      recordB: 'REC-002',
      departmentsInvolved: ['Production', 'Maintenance'],
      conflictReason: 'Machine M-07 is scheduled for maintenance during active production shift.',
      severity: 'High',
      status: 'pending',
      statusType: 'urgent',
      aiSummary: 'Production and Maintenance have overlapping resource requirements for Machine M-07 on the same shift.',
      recommendation: 'Reschedule maintenance to off-peak shift or delay production run.',
      confidence: 85,
      count: 1,
      first_detected: new Date().toISOString(),
      last_detected: new Date().toISOString(),
      reportedAt: 'Just now',
    };

    await db.collection('conflicts').add(demoConflict);
    return { message: 'Demo data seeded' };
  }

  // Get total records count
async getRecordsCount() {
  try {
    const snapshot = await db.collection('records').get();
    return snapshot.size;
  } catch (error) {
    console.error('Error getting record count:', error);
    return 0;
  }
}

// Save with custom ID
async saveRecordWithId(recordData, customId) {
  try {
    const record = {
      ...recordData,
      id: customId,
      timestamp: new Date().toISOString(),
      status: recordData.status || 'pending'
    };
    
    await db.collection('records').doc(customId).set(record);
    console.log('✅ Record saved with custom ID:', customId);
    return { id: customId, ...record };
  } catch (error) {
    console.error('❌ Error saving record:', error);
    throw error;
  }
}
}

module.exports = new StateManager();
