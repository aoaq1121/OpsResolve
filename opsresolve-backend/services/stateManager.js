const { db } = require('../config/firebase');

class StateManager {

  // ── Records ──────────────────────────────────────────────────────────────────

  async getRecordsCount() {
    const snapshot = await db.collection('records').get();
    return snapshot.size;
  }

  async saveRecordWithId(recordData, customId) {
    const record = {
      ...recordData,
      id: customId,
      timestamp: new Date().toISOString(),
      status: recordData.status || 'pending',
    };
    await db.collection('records').doc(customId).set(record);
    return { id: customId, ...record };
  }

  async saveRecord(recordData) {
    const count = await this.getRecordsCount();
    const customId = `record${count + 1}`;
    return this.saveRecordWithId(recordData, customId);
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

  // ── Conflicts ────────────────────────────────────────────────────────────────

  async getConflictsCount() {
    const snapshot = await db.collection('conflicts').get();
    return snapshot.size;
  }

  async saveConflictWithId(conflictData, customId) {
    const conflict = {
      ...conflictData,
      conflictId: customId,
      count: 1,
      first_detected: new Date().toISOString(),
      last_detected: new Date().toISOString(),
      status: conflictData.status || 'active',
      statusType: conflictData.statusType || 'urgent',
    };
    await db.collection('conflicts').doc(customId).set(conflict);
    return { id: customId, ...conflict };
  }

  async saveConflict(conflictData) {
    const existing = await db.collection('conflicts')
      .where('recordA', '==', conflictData.recordA)
      .where('recordB', '==', conflictData.recordB)
      .get();

    if (!existing.empty) {
      const count = (existing.docs[0].data().count || 1) + 1;
      await existing.docs[0].ref.update({
        count,
        last_detected: new Date().toISOString(),
        status: conflictData.status || 'active',
      });
      return { id: existing.docs[0].id, ...existing.docs[0].data(), count };
    }

    const conflictsCount = await this.getConflictsCount();
    const customId = `conflict${conflictsCount + 1}`;
    return this.saveConflictWithId(conflictData, customId);
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
    const snapshot = await db.collection('conflicts').where('count', '>=', minCount).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async updateConflictStatus(conflictId, status) {
    const snapshot = await db.collection('conflicts').where('conflictId', '==', conflictId).get();
    if (snapshot.empty) throw new Error('Conflict not found');
    await snapshot.docs[0].ref.update({ status });
  }

  // ── Decisions ────────────────────────────────────────────────────────────────

  async getDecisionsCount() {
    const snapshot = await db.collection('decisions').get();
    return snapshot.size;
  }

  async saveDecisionWithId(decisionData, customId) {
    const decision = {
      ...decisionData,
      decisionId: customId,
      timestamp: new Date().toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }),
    };
    await db.collection('decisions').doc(customId).set(decision);

    if (decisionData.conflictId) {
      await this.updateConflictStatus(
        decisionData.conflictId,
        decisionData.managerAction === 'accepted' || decisionData.managerAction === 'overridden'
          ? 'resolved'
          : 'active'
      );
    }

    return { id: customId, ...decision };
  }

  async saveDecision(decisionData) {
    const count = await this.getDecisionsCount();
    const customId = `decision${count + 1}`;
    return this.saveDecisionWithId(decisionData, customId);
  }

  async getAllDecisions() {
    const snapshot = await db.collection('decisions').orderBy('timestamp', 'desc').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  // ── Announcements ────────────────────────────────────────────────────────────

  async getAnnouncementsCount() {
    const snapshot = await db.collection('announcements').get();
    return snapshot.size;
  }

  async saveAnnouncementWithId(announcementData, customId) {
    const announcement = {
      ...announcementData,
      announcementId: customId,
      timestamp: new Date().toISOString(),
    };
    await db.collection('announcements').doc(customId).set(announcement);
    return { id: customId, ...announcement };
  }

  async saveAnnouncement(announcementData) {
    const count = await this.getAnnouncementsCount();
    const customId = `announcement${count + 1}`;
    return this.saveAnnouncementWithId(announcementData, customId);
  }

  // ── Reviews ──────────────────────────────────────────────────────────────────

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

  // ── Statistics ───────────────────────────────────────────────────────────────

  async getStatistics() {
    const [records, conflicts, decisions] = await Promise.all([
      db.collection('records').get(),
      db.collection('conflicts').get(),
      db.collection('decisions').get(),
    ]);

    const resolvedConflicts = conflicts.docs.filter((d) => d.data().status === 'resolved').length;
    const acceptedDecisions = decisions.docs.filter((d) => d.data().managerAction === 'accepted').length;
    const overriddenDecisions = decisions.docs.filter((d) => d.data().managerAction === 'overridden').length;

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

  // ── Demo seed ────────────────────────────────────────────────────────────────

  async seedDemoData() {
    const demoConflict = {
      conflictId: `conflict_demo_${Date.now()}`,
      recordA: 'REC-001',
      recordB: 'REC-002',
      departmentsInvolved: ['Production', 'Maintenance'],
      conflictReason: 'Machine M-07 is scheduled for maintenance during active production shift.',
      severity: 'High',
      status: 'active',
      statusType: 'urgent',
      aiSummary: 'Production and Maintenance have overlapping resource requirements for Machine M-07 on the same shift.',
      recommendation: 'Reschedule maintenance to off-peak shift or delay production run.',
      confidence: 85,
      count: 1,
      first_detected: new Date().toISOString(),
      last_detected: new Date().toISOString(),
    };

    await db.collection('conflicts').add(demoConflict);
    return { message: 'Demo data seeded' };
  }
}

module.exports = new StateManager();
