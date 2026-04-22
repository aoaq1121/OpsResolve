const { db } = require('../config/firebase');

class StateManager {
  
  // ========== 1. RECORD MANAGEMENT ==========
  
  async saveRecord(recordData) {
    try {
      const record = {
        ...recordData,
        id: `record_${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: recordData.status || 'pending'  // pending, notified, scheduled, accepted, overridden
      };
      
      const docRef = await db.collection('records').add(record);
      console.log('✅ Record saved:', record.id);
      return { id: docRef.id, ...record };
    } catch (error) {
      console.error('❌ Error saving record:', error);
      throw error;
    }
  }
  
  async getAllRecords() {
    try {
      const snapshot = await db.collection('records')
        .orderBy('timestamp', 'desc')
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('❌ Error getting records:', error);
      throw error;
    }
  }
  
  async updateRecordStatus(recordId, newStatus) {
    try {
      await db.collection('records').doc(recordId).update({
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Record status updated:', recordId, '→', newStatus);
      return true;
    } catch (error) {
      console.error('❌ Error updating record:', error);
      throw error;
    }
  }
  
  // ========== 2. CONFLICT MANAGEMENT (WITH RECURRENCE TRACKING) ==========
  
  async saveConflict(conflictData) {
    try {
      // Check if similar conflict already exists
      const existingConflict = await this.findSimilarConflict(
        conflictData.department_a,
        conflictData.department_b,
        conflictData.conflict_type
      );
      
      let count = 1;
      if (existingConflict && existingConflict.status === 'active') {
        count = existingConflict.count + 1;
        console.log(`⚠️ Recurring conflict! This is #${count} time`);
      }
      
      const conflict = {
        ...conflictData,
        id: `conflict_${Date.now()}`,
        first_detected: existingConflict?.first_detected || new Date().toISOString(),
        last_detected: new Date().toISOString(),
        count: count,  // ← KEY FEATURE: recurring conflict counter
        status: 'active'  // active or resolved
      };
      
      const docRef = await db.collection('conflicts').add(conflict);
      console.log('✅ Conflict saved:', conflict.id, '| Count:', count);
      return { id: docRef.id, ...conflict };
    } catch (error) {
      console.error('❌ Error saving conflict:', error);
      throw error;
    }
  }
  
  async findSimilarConflict(deptA, deptB, conflictType) {
    try {
      const snapshot = await db.collection('conflicts')
        .where('status', '==', 'active')
        .limit(5)
        .get();
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.conflict_type === conflictType &&
            ((data.department_a === deptA && data.department_b === deptB) ||
             (data.department_a === deptB && data.department_b === deptA))) {
          return { id: doc.id, ...data };
        }
      }
      return null;
    } catch (error) {
      console.error('Error finding similar conflict:', error);
      return null;
    }
  }
  
  async getAllActiveConflicts() {
    try {
      const snapshot = await db.collection('conflicts')
        .where('status', '==', 'active')
        .orderBy('count', 'desc')  // Show recurring conflicts first
        .orderBy('severity', 'desc')
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('❌ Error getting conflicts:', error);
      throw error;
    }
  }
  
  async getConflictById(conflictId) {
    try {
      const doc = await db.collection('conflicts').doc(conflictId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('❌ Error getting conflict:', error);
      throw error;
    }
  }
  
  async resolveConflict(conflictId, resolution) {
    try {
      await db.collection('conflicts').doc(conflictId).update({
        status: 'resolved',
        resolution: resolution,
        resolved_at: new Date().toISOString()
      });
      console.log('✅ Conflict resolved:', conflictId);
      return true;
    } catch (error) {
      console.error('❌ Error resolving conflict:', error);
      throw error;
    }
  }
  
  // SPECIAL: Get conflicts that happened multiple times
  async getRecurringConflicts(minCount = 2) {
    try {
      const snapshot = await db.collection('conflicts')
        .where('count', '>=', minCount)
        .where('status', '==', 'active')
        .orderBy('count', 'desc')
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('❌ Error getting recurring conflicts:', error);
      throw error;
    }
  }
  
  // ========== 3. DECISION MANAGEMENT ==========
  
  async saveDecision(decisionData) {
    try {
      const decision = {
        ...decisionData,
        id: `decision_${Date.now()}`,
        timestamp: new Date().toISOString()
      };
      
      const docRef = await db.collection('decisions').add(decision);
      
      // Update record status if needed
      if (decisionData.record_id) {
        await this.updateRecordStatus(decisionData.record_id, decisionData.status);
      }
      
      // Resolve conflict if decision accepts it
      if (decisionData.conflict_id && decisionData.decision_type === 'accept') {
        await this.resolveConflict(decisionData.conflict_id, decisionData.action_taken);
      }
      
      console.log('✅ Decision saved:', decision.id);
      return { id: docRef.id, ...decision };
    } catch (error) {
      console.error('❌ Error saving decision:', error);
      throw error;
    }
  }
  
  async getAllDecisions() {
    try {
      const snapshot = await db.collection('decisions')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('❌ Error getting decisions:', error);
      throw error;
    }
  }
  
  // ========== 4. STATISTICS (For dashboard) ==========
  
  async getStatistics() {
    try {
      const recordsSnapshot = await db.collection('records').get();
      const conflictsSnapshot = await db.collection('conflicts').get();
      const decisionsSnapshot = await db.collection('decisions').get();
      
      const activeConflicts = await this.getAllActiveConflicts();
      const recurringConflicts = await this.getRecurringConflicts(2);
      
      return {
        totalRecords: recordsSnapshot.size,
        totalConflicts: conflictsSnapshot.size,
        totalDecisions: decisionsSnapshot.size,
        activeConflicts: activeConflicts.length,
        recurringConflicts: recurringConflicts.length,
        highSeverityConflicts: activeConflicts.filter(c => c.severity === 'high').length
      };
    } catch (error) {
      console.error('❌ Error getting statistics:', error);
      throw error;
    }
  }
  
  // ========== 5. DEMO DATA (For testing) ==========
  
  async seedDemoData() {
    console.log('🌱 Seeding demo data...');
    
    // Demo records
    const record1 = await this.saveRecord({
      title: "Production Line A - Friday Rush",
      department: "Production",
      notes: "Need to run Line A at full capacity Friday for urgent client order",
      status: "pending",
      submittedBy: "Production"
    });
    
    const record2 = await this.saveRecord({
      title: "Line A Scheduled Maintenance",
      department: "Maintenance",
      notes: "Mandatory 4-hour preventive maintenance for Line A on Friday",
      status: "pending",
      submittedBy: "Maintenance"
    });
    
    // Demo conflict (with recurrence count)
    await this.saveConflict({
      conflict_type: "schedule_mismatch",
      department_a: "Production",
      department_b: "Maintenance",
      records_involved: [record1.id, record2.id],
      issue_summary: "Production needs Line A at full capacity, but Maintenance scheduled shutdown",
      severity: "high",
      confidence: 0.92,
      ai_recommendation: "Reschedule maintenance to Saturday or run production with reduced load"
    });
    
    console.log('✅ Demo data seeded!');
  }
}

module.exports = new StateManager();