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

  // ── Machines ─────────────────────────────────────────────────────────────────

  async getMachinesCount() {
    const snapshot = await db.collection('machines').get();
    return snapshot.size;
  }

  async saveMachine(machineData) {
    const count = await this.getMachinesCount();
    const customId = `machine${String(count + 1).padStart(3, '0')}`;
    const machine = {
      ...machineData,
      id: customId,
      status: machineData.status || 'available',
      scheduledSlots: machineData.scheduledSlots || [],
      createdAt: new Date().toISOString(),
    };
    await db.collection('machines').doc(customId).set(machine);
    return { id: customId, ...machine };
  }

  async getAllMachines() {
    const snapshot = await db.collection('machines').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getMachinesByDepartment(department) {
    const snapshot = await db.collection('machines')
      .where('department', '==', department)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getMachinesByType(type) {
    const snapshot = await db.collection('machines')
      .where('type', '==', type)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  // Check which machines are available for a given date + shift
  async getAvailableMachines({ date, shift, type, department }) {
    const snapshot = await db.collection('machines').get();
    let machines = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Filter by status
    machines = machines.filter((m) => m.status !== 'under_maintenance');

    // Filter by type (case-insensitive) or department
    if (type) {
      machines = machines.filter((m) => m.type?.toLowerCase() === type.toLowerCase());
    } else if (department) {
      machines = machines.filter((m) => m.department === department);
    }

    // Filter out machines already booked for this date + shift
    return machines.filter((m) => {
      const slots = m.scheduledSlots || [];
      return !slots.some((s) => s.date === date && s.shift === shift);
    });
  }

  async bookMachineSlot(machineId, { date, shift, workOrderId, department }) {
    const snapshot = await db.collection('machines').where('id', '==', machineId).get();
    if (snapshot.empty) throw new Error('Machine not found');

    const doc = snapshot.docs[0];
    const machine = doc.data();
    const slots = machine.scheduledSlots || [];

    // Check if already booked
    const alreadyBooked = slots.some((s) => s.date === date && s.shift === shift);
    if (alreadyBooked) throw new Error(`Machine ${machineId} is already booked for ${shift} shift on ${date}`);

    slots.push({ date, shift, workOrderId, department, bookedAt: new Date().toISOString() });
    await doc.ref.update({ scheduledSlots: slots });
    return { machineId, date, shift, workOrderId };
  }

  async releaseMachineSlot(machineId, { date, shift }) {
    const snapshot = await db.collection('machines').where('id', '==', machineId).get();
    if (snapshot.empty) throw new Error('Machine not found');

    const doc = snapshot.docs[0];
    const machine = doc.data();
    const slots = (machine.scheduledSlots || []).filter(
      (s) => !(s.date === date && s.shift === shift)
    );
    await doc.ref.update({ scheduledSlots: slots });
    return { success: true };
  }

  async updateMachineStatus(machineId, status) {
    const snapshot = await db.collection('machines').where('id', '==', machineId).get();
    if (snapshot.empty) throw new Error('Machine not found');
    await snapshot.docs[0].ref.update({ status });
  }

  // ── Work Orders ───────────────────────────────────────────────────────────────

  async getWorkOrdersCount() {
    const snapshot = await db.collection('workOrders').get();
    return snapshot.size;
  }

  async saveWorkOrder(workOrderData) {
    const count = await this.getWorkOrdersCount();
    const customId = `wo${String(count + 1).padStart(4, '0')}`;
    const workOrder = {
      ...workOrderData,
      id: customId,
      status: workOrderData.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.collection('workOrders').doc(customId).set(workOrder);

    // Also book the machine slot if machineId is provided
    if (workOrderData.machineId && workOrderData.date && workOrderData.shift) {
      try {
        await this.bookMachineSlot(workOrderData.machineId, {
          date: workOrderData.date,
          shift: workOrderData.shift,
          workOrderId: customId,
          department: workOrderData.department,
        });
      } catch (err) {
        console.warn('Could not book machine slot:', err.message);
      }
    }

    // Also save to records collection for backward compatibility with conflict detection
    await this.saveRecordWithId({
      ...workOrderData,
      title: workOrderData.workOrderNo || workOrderData.title || customId,
      source: 'workOrder',
      workOrderId: customId,
    }, `record${(await this.getRecordsCount()) + 1}`);

    return { id: customId, ...workOrder };
  }

  async getAllWorkOrders() {
    const snapshot = await db.collection('workOrders').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getWorkOrdersByDepartment(department) {
    const snapshot = await db.collection('workOrders')
      .where('department', '==', department)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getWorkOrderById(id) {
    const snapshot = await db.collection('workOrders').where('id', '==', id).get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  async updateWorkOrderStatus(id, status) {
    const snapshot = await db.collection('workOrders').where('id', '==', id).get();
    if (snapshot.empty) throw new Error('Work order not found');
    await snapshot.docs[0].ref.update({ status, updatedAt: new Date().toISOString() });
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
    const [records, conflicts, decisions, workOrders, machines] = await Promise.all([
      db.collection('records').get(),
      db.collection('conflicts').get(),
      db.collection('decisions').get(),
      db.collection('workOrders').get(),
      db.collection('machines').get(),
    ]);

    const resolvedConflicts = conflicts.docs.filter((d) => d.data().status === 'resolved').length;
    const acceptedDecisions = decisions.docs.filter((d) => d.data().managerAction === 'accepted').length;
    const overriddenDecisions = decisions.docs.filter((d) => d.data().managerAction === 'overridden').length;
    const availableMachines = machines.docs.filter((d) => d.data().status === 'available').length;

    return {
      totalRecords: records.size,
      totalConflicts: conflicts.size,
      resolvedConflicts,
      openConflicts: conflicts.size - resolvedConflicts,
      totalDecisions: decisions.size,
      acceptedDecisions,
      overriddenDecisions,
      totalWorkOrders: workOrders.size,
      totalMachines: machines.size,
      availableMachines,
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

    // Seed demo machines
    const demoMachines = [
      { name: 'Sanding Machine S-01', type: 'Sanding', location: 'Line A', department: 'Production', status: 'available' },
      { name: 'Sanding Machine S-02', type: 'Sanding', location: 'Line B', department: 'Production', status: 'available' },
      { name: 'Welding Machine W-01', type: 'Welding', location: 'Bay 1', department: 'Production', status: 'available' },
      { name: 'Welding Machine W-02', type: 'Welding', location: 'Bay 2', department: 'Production', status: 'available' },
      { name: 'CNC Machine C-01', type: 'CNC Cutting', location: 'Line A', department: 'Production', status: 'available' },
      { name: 'Assembly Station A-01', type: 'Assembly', location: 'Line A', department: 'Production', status: 'available' },
      { name: 'Assembly Station A-02', type: 'Assembly', location: 'Line B', department: 'Production', status: 'available' },
      { name: 'Painting Booth P-01', type: 'Painting', location: 'Bay 3', department: 'Production', status: 'available' },
      { name: 'Packaging Line PK-01', type: 'Packaging', location: 'Warehouse', department: 'Production', status: 'available' },
      { name: 'QC Station QC-01', type: 'Inspection', location: 'QC Lab', department: 'Quality Control', status: 'available' },
      { name: 'QC Station QC-02', type: 'Inspection', location: 'QC Lab', department: 'Quality Control', status: 'available' },
      { name: 'Forklift FL-01', type: 'Forklift', location: 'Warehouse', department: 'Logistics', status: 'available' },
      { name: 'Forklift FL-02', type: 'Forklift', location: 'Receiving Bay', department: 'Logistics', status: 'available' },
    ];

    for (const machine of demoMachines) {
      await this.saveMachine(machine);
    }

    // Seed mock records for all departments (for AI imputation history)
    const mockRecords = [
      // Quality Control records
      { department: 'Quality Control', category: 'Quality Control', inspectionType: 'Incoming Material', batchRef: 'WO-2201 / Batch RM-0422', productName: 'Steel Panel A-Series', priority: 'High', sampleSize: '30 pcs', qcStation: 'QC Station 1', defectType: 'Surface defect', disposition: 'Hold', date: '2026-04-20', shift: 'Morning', duration: '1–2 hours', description: 'ISO 9001:2015 incoming inspection. Surface defect found on 3 of 30 samples.', status: 'completed' },
      { department: 'Quality Control', category: 'Quality Control', inspectionType: 'Incoming Material', batchRef: 'WO-2202 / Batch RM-0423', productName: 'Steel Panel A-Series', priority: 'High', sampleSize: '30 pcs', qcStation: 'QC Station 1', defectType: 'None', disposition: 'Accept', date: '2026-04-21', shift: 'Morning', duration: '1–2 hours', description: 'ISO 9001:2015 incoming inspection. All samples passed dimensional and surface checks.', status: 'completed' },
      { department: 'Quality Control', category: 'Quality Control', inspectionType: 'Final Inspection', batchRef: 'WO-2200 / Batch FG-0420', productName: 'Bracket B-Type', priority: 'Normal', sampleSize: '50 pcs', qcStation: 'QC Station 2', defectType: 'Dimensional', disposition: 'Rework', date: '2026-04-19', shift: 'Afternoon', duration: '2–4 hours', description: 'Final QC before shipment. Dimensional tolerance exceeded on 5 units.', status: 'completed' },
      { department: 'Quality Control', category: 'Quality Control', inspectionType: 'In-Process', batchRef: 'WO-2198 / Batch IP-0418', productName: 'Aluminium Frame C', priority: 'Normal', sampleSize: '20 pcs', qcStation: 'QC Station 1', defectType: 'None', disposition: 'Accept', date: '2026-04-18', shift: 'Morning', duration: '1–2 hours', description: 'In-process check at sanding stage. All within spec.', status: 'completed' },

      // Production records
      { department: 'Production', category: 'Production', workOrderNo: 'WO-2195', productName: 'Steel Panel A-Series', processType: 'Sanding', targetQuantity: '500', unit: 'pcs', location: 'Line A', shift: 'Morning', date: '2026-04-17', duration: '4–8 hours', priority: 'Normal', impact: 'No disruption', description: 'Standard sanding run for batch RM-0417.', status: 'completed' },
      { department: 'Production', category: 'Production', workOrderNo: 'WO-2196', productName: 'Bracket B-Type', processType: 'Welding', targetQuantity: '200', unit: 'pcs', location: 'Bay 1', shift: 'Afternoon', date: '2026-04-18', duration: '4–8 hours', priority: 'High', impact: 'Minor disruption', description: 'Welding run for bracket assembly order.', status: 'completed' },

      // Maintenance records
      { department: 'Maintenance', category: 'Maintenance', equipmentId: 'M-05', title: 'CNC Machine M-05', maintenanceType: 'Preventive', location: 'Line A', estimatedDowntime: '2–4 hours', spareParts: 'Lubrication oil, filters', technician: 'Ahmad bin Ali', shift: 'Night', date: '2026-04-16', duration: '2–4 hours', priority: 'Normal', description: 'Scheduled preventive maintenance for CNC M-05.', status: 'completed' },
      { department: 'Maintenance', category: 'Maintenance', equipmentId: 'M-07', title: 'Machine M-07', maintenanceType: 'Corrective', location: 'Line B', estimatedDowntime: '4–8 hours', spareParts: 'Bearing #6205, Belt V-type', technician: 'Razif bin Hassan', shift: 'Morning', date: '2026-04-22', duration: '4–8 hours', priority: 'High', description: 'Corrective maintenance after breakdown during production shift.', status: 'completed' },

      // Logistics records
      { department: 'Logistics', category: 'Logistics', requestType: 'Inbound Delivery', vendorName: 'ABC Steel Supplies Sdn Bhd', poNumber: 'PO-20240420', materialDesc: 'Raw steel rods Grade A', quantity: '500 kg', bay: 'Bay 3', vehicleRequired: 'Forklift', date: '2026-04-20', shift: 'Morning', priority: 'Normal', description: 'Standard inbound delivery of steel rods.', status: 'completed' },
      { department: 'Logistics', category: 'Logistics', requestType: 'Inbound Delivery', vendorName: 'ABC Steel Supplies Sdn Bhd', poNumber: 'PO-20240422', materialDesc: 'Steel sheet panels', quantity: '300 kg', bay: 'Bay 3', vehicleRequired: 'Forklift', date: '2026-04-22', shift: 'Morning', priority: 'High', description: 'Urgent delivery of steel panels for production order.', status: 'completed' },
    ];

    for (const record of mockRecords) {
      await this.saveRecord(record);
    }

    return { message: 'Demo data seeded successfully' };
  }
}

module.exports = new StateManager();
