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

  async getAllConflicts() {
    const snapshot = await db.collection('conflicts').get();
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
    // Try matching by conflictId field first
    const snapshot = await db.collection('conflicts').where('conflictId', '==', conflictId).get();
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({ status });
      return;
    }
    // Fall back to doc ID
    const docRef = db.collection('conflicts').doc(conflictId);
    const doc = await docRef.get();
    if (doc.exists) {
      await docRef.update({ status });
      return;
    }
    throw new Error('Conflict not found');
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
      managerName: decisionData.managerName || null,
      department: decisionData.department || null,
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

  // ── Performance Stats ─────────────────────────────────────────────────────────

  async getPerformanceStats() {
    const [conflictsSnap, decisionsSnap] = await Promise.all([
      db.collection('conflicts').get(),
      db.collection('decisions').get(),
    ]);

    const conflicts = conflictsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const decisions = decisionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const DEPARTMENTS = ['Production', 'Maintenance', 'Logistics', 'Quality Control'];

    const deptStats = DEPARTMENTS.map(dept => {
      const deptConflicts = conflicts.filter(c =>
        (c.departmentsInvolved || []).includes(dept)
      );
      const deptDecisions = decisions.filter(d => d.department === dept);
      const resolved = deptConflicts.filter(c => c.status === 'resolved' || c.status === 'overridden').length;
      const total = deptConflicts.length;
      const accepted = deptDecisions.filter(d => d.managerAction === 'accepted').length;
      const overridden = deptDecisions.filter(d => d.managerAction === 'overridden').length;

      // Calculate avg resolution time in hours
      let avgResolutionHours = null;
      const resolvedWithTime = deptConflicts.filter(c =>
        (c.status === 'resolved' || c.status === 'overridden') &&
        c.first_detected && c.last_detected
      );
      if (resolvedWithTime.length > 0) {
        const totalHours = resolvedWithTime.reduce((sum, c) => {
          const diff = new Date(c.last_detected) - new Date(c.first_detected);
          return sum + diff / (1000 * 60 * 60);
        }, 0);
        avgResolutionHours = Math.round((totalHours / resolvedWithTime.length) * 10) / 10;
      }

      return {
        department: dept,
        totalConflicts: total,
        resolved,
        open: total - resolved,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        accepted,
        overridden,
        avgResolutionHours,
      };
    });

    // Manager track records
    const managerStats = {};
    decisions.forEach(d => {
      if (!d.managerName) return;
      const key = d.managerName;
      if (!managerStats[key]) {
        managerStats[key] = {
          name: d.managerName,
          department: d.department,
          totalDecisions: 0,
          accepted: 0,
          overridden: 0,
          escalated: 0,
          lastActive: null,
        };
      }
      managerStats[key].totalDecisions++;
      if (d.managerAction === 'accepted') managerStats[key].accepted++;
      if (d.managerAction === 'overridden') managerStats[key].overridden++;
      if (d.managerAction === 'escalated') managerStats[key].escalated++;
      if (!managerStats[key].lastActive || d.timestamp > managerStats[key].lastActive) {
        managerStats[key].lastActive = d.timestamp;
      }
    });

    return {
      departments: deptStats,
      managers: Object.values(managerStats),
    };
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

    // Seed records that match the mock conflicts
    const conflictRecords = [
      // conflict_t1 records
      { id: 'record_prod_1', department: 'Production', category: 'Production', title: 'Production Work Order WO-2210', workOrderNo: 'WO-2210', productName: 'Steel Panel A-Series', processType: 'Sanding', location: 'Line A', shift: 'Morning', date: '2026-04-25', duration: '4–8 hours', priority: 'High', equipment: 'Machine M-07', status: 'active' },
      { id: 'record_maint_1', department: 'Maintenance', category: 'Maintenance', title: 'Machine M-07 Preventive Maintenance', equipmentId: 'M-07', maintenanceType: 'Preventive', location: 'Line A', shift: 'Morning', date: '2026-04-25', duration: '4–8 hours', priority: 'High', equipment: 'Machine M-07', estimatedDowntime: '4–8 hours', technician: 'Ahmad bin Ali', status: 'active' },

      // conflict_t2 records
      { id: 'record_log_1', department: 'Logistics', category: 'Logistics', title: 'Inbound Delivery Batch RM-0426', requestType: 'Inbound Delivery', vendorName: 'ABC Steel Supplies Sdn Bhd', poNumber: 'PO-20260426', materialDesc: 'Steel sheet panels', quantity: '300 kg', bay: 'Bay 3', vehicleRequired: 'Forklift', shift: 'Morning', date: '2026-04-26', priority: 'Normal', status: 'active' },
      { id: 'record_qc_1', department: 'Quality Control', category: 'Quality Control', title: 'Incoming Inspection Batch RM-0426', inspectionType: 'Incoming Material', batchRef: 'Batch RM-0426', productName: 'Steel sheet panels', qcStation: 'QC Station 1', shift: 'Morning', date: '2026-04-26', duration: '1–2 hours', priority: 'Normal', status: 'active' },

      // conflict_r1 records
      { id: 'record_prod_2', department: 'Production', category: 'Production', title: 'Work Order WO-2211 — Bracket B-Type Welding', workOrderNo: 'WO-2211', productName: 'Bracket B-Type', processType: 'Welding', location: 'Bay 1', shift: 'Afternoon', date: '2026-04-25', duration: '4–8 hours', priority: 'High', equipment: 'Welding Machine W-01', targetQuantity: '150', unit: 'pcs', status: 'active' },
      { id: 'record_prod_3', department: 'Production', category: 'Production', title: 'Work Order WO-2212 — Frame Assembly Welding', workOrderNo: 'WO-2212', productName: 'Aluminium Frame Assembly', processType: 'Welding', location: 'Bay 1', shift: 'Afternoon', date: '2026-04-25', duration: '2–4 hours', priority: 'Normal', equipment: 'Welding Machine W-01', targetQuantity: '80', unit: 'pcs', status: 'active' },

      // conflict_r2 records
      { id: 'record_log_2', department: 'Logistics', category: 'Logistics', title: 'Outbound Shipment — Customer Order CO-0425', requestType: 'Outbound Shipment', vendorName: 'XYZ Trading Sdn Bhd', poNumber: 'DO-20260426', materialDesc: 'Finished bracket units', quantity: '200 pcs', bay: 'Loading Dock A', vehicleRequired: 'Forklift', shift: 'Morning', date: '2026-04-26', priority: 'High', equipment: 'Forklift FL-01', status: 'active' },
      { id: 'record_prod_4', department: 'Production', category: 'Production', title: 'Material Transfer to Line B — Batch RM-0425', workOrderNo: 'WO-2213', productName: 'Raw Steel Rods', processType: 'Assembly', location: 'Line B', shift: 'Morning', date: '2026-04-26', duration: 'Less than 1 hour', priority: 'Normal', equipment: 'Forklift FL-01', status: 'active' },

      // conflict_d1 records
      { id: 'record_log_3', department: 'Logistics', category: 'Logistics', title: 'Raw Material Delivery — Batch RM-2204', requestType: 'Inbound Delivery', vendorName: 'Steel Corp Sdn Bhd', poNumber: 'PO-20260425', materialDesc: 'Raw material batch RM-2204', quantity: '500 kg', bay: 'Bay 3', vehicleRequired: 'Forklift', shift: 'Morning', date: '2026-04-25', priority: 'High', status: 'active' },
      { id: 'record_qc_2', department: 'Quality Control', category: 'Quality Control', title: 'Incoming Inspection — Batch RM-2204', inspectionType: 'Incoming Material', batchRef: 'Batch RM-2204', productName: 'Raw steel rods', qcStation: 'QC Station 1', shift: 'Morning', date: '2026-04-25', duration: '1–2 hours', priority: 'High', status: 'active' },

      // conflict_d2 records
      { id: 'record_prod_5', department: 'Production', category: 'Production', title: 'Production Run WO-2210 — Steel Panel A-Series', workOrderNo: 'WO-2210', productName: 'Steel Panel A-Series', processType: 'Sanding', location: 'Line A', shift: 'Morning', date: '2026-04-25', duration: '4–8 hours', priority: 'High', equipment: 'Machine M-07', status: 'active' },
      { id: 'record_qc_3', department: 'Quality Control', category: 'Quality Control', title: 'Final Inspection WO-2210 Output', inspectionType: 'Final Inspection', batchRef: 'WO-2210', productName: 'Steel Panel A-Series', qcStation: 'QC Station 2', shift: 'Afternoon', date: '2026-04-25', duration: '2–4 hours', priority: 'High', status: 'active' },
    ];

    for (const record of conflictRecords) {
      await db.collection('records').doc(record.id).set({ ...record, timestamp: new Date().toISOString() });
    }
    const mockConflicts = [
      // ── Time-based clash 1: Production vs Maintenance ──
      {
        conflictId: 'conflict_t1',
        recordA: 'record_prod_1',
        recordB: 'record_maint_1',
        departmentsInvolved: ['Production', 'Maintenance'],
        severity: 'High',
        status: 'active',
        statusType: 'urgent',
        confidence: 88,
        conflictReason: 'Machine M-07 scheduled for preventive maintenance on April 25 Morning shift conflicts with Production work order WO-2210 scheduled on the same date and shift.',
        issue_summary: 'Both Production and Maintenance have scheduled activities on Machine M-07 during the same Morning shift on April 25, 2026. The preventive maintenance requires the machine to be fully offline, while the production work order requires it to be running at full capacity. The same shift overlap means neither can proceed without disrupting the other.',
        ai_recommendation: 'Reschedule the preventive maintenance to the Night shift on April 25 or defer to April 26 Morning shift to allow the production run to complete on schedule.',
        first_detected: new Date('2026-04-25T06:00:00').toISOString(),
        last_detected: new Date('2026-04-25T06:00:00').toISOString(),
        count: 1,
      },

      // ── Time-based clash 2: Logistics vs Quality Control ──
      {
        conflictId: 'conflict_t2',
        recordA: 'record_log_1',
        recordB: 'record_qc_1',
        departmentsInvolved: ['Logistics', 'Quality Control'],
        severity: 'Medium',
        status: 'active',
        statusType: 'urgent',
        confidence: 74,
        conflictReason: 'Logistics inbound delivery and QC incoming inspection both scheduled at Bay 3 during the same Morning shift on April 26, creating a scheduling overlap.',
        issue_summary: 'Logistics has scheduled an inbound delivery of Batch RM-0426 at Bay 3 on April 26 Morning shift. Quality Control has also scheduled an incoming material inspection at the same bay and shift. Bay 3 cannot accommodate both operations simultaneously as the delivery requires forklift access while inspection requires the area to be clear. The simultaneous scheduling creates a conflict over the same space and time window.',
        ai_recommendation: 'Stagger the two activities — allow Logistics to complete the delivery in the first hour of the Morning shift, then Quality Control begins inspection in the second hour.',
        first_detected: new Date('2026-04-25T08:00:00').toISOString(),
        last_detected: new Date('2026-04-25T08:00:00').toISOString(),
        count: 1,
      },

      // ── Resource-based clash 1: Production vs Production ──
      {
        conflictId: 'conflict_r1',
        recordA: 'record_prod_2',
        recordB: 'record_prod_3',
        departmentsInvolved: ['Production', 'Maintenance'],
        severity: 'High',
        status: 'active',
        statusType: 'urgent',
        confidence: 92,
        conflictReason: 'Welding Machine W-01 at Bay 1 is requested by two separate work orders — WO-2211 and WO-2212 — for the same Afternoon shift on April 25.',
        issue_summary: 'Two production work orders both require Welding Machine W-01 at Bay 1 during the Afternoon shift on April 25. The machine can only run one job at a time. WO-2211 requires 4 hours of welding for Bracket B-Type and WO-2212 requires 3 hours for Frame Assembly. Total demand is 7 hours but only one 8-hour shift is available and the machine setup between jobs takes 45 minutes. Running both in sequence is not feasible within the same shift.',
        ai_recommendation: 'Prioritise WO-2211 for Afternoon shift on April 25. Reschedule WO-2212 to Morning shift on April 26 to ensure both work orders are completed without quality compromise.',
        first_detected: new Date('2026-04-25T09:00:00').toISOString(),
        last_detected: new Date('2026-04-25T09:00:00').toISOString(),
        count: 2,
      },

      // ── Resource-based clash 2: Logistics vs Production ──
      {
        conflictId: 'conflict_r2',
        recordA: 'record_log_2',
        recordB: 'record_prod_4',
        departmentsInvolved: ['Logistics', 'Production'],
        severity: 'Medium',
        status: 'active',
        statusType: 'urgent',
        confidence: 79,
        conflictReason: 'Forklift FL-01 is required simultaneously by Logistics for an outbound shipment and by Production for moving raw materials to Line B during the same Morning shift.',
        issue_summary: 'Forklift FL-01 has been requested by both Logistics for an outbound shipment at Loading Dock A and by Production for internal material transfer to Line B. Both requests are for the Morning shift on April 26. The forklift cannot be in two locations at the same time. The same equipment and same manpower are needed simultaneously, creating a direct resource conflict.',
        ai_recommendation: 'Assign Forklift FL-01 to Production for the first 2 hours of Morning shift for material transfer, then hand off to Logistics for the outbound shipment. Alternatively, deploy Forklift FL-02 for the Logistics task if available.',
        first_detected: new Date('2026-04-25T10:00:00').toISOString(),
        last_detected: new Date('2026-04-25T10:00:00').toISOString(),
        count: 1,
      },

      // ── Dependency-based clash 1: Logistics → Quality Control → Production ──
      {
        conflictId: 'conflict_d1',
        recordA: 'record_log_3',
        recordB: 'record_qc_2',
        departmentsInvolved: ['Logistics', 'Quality Control'],
        severity: 'High',
        status: 'active',
        statusType: 'urgent',
        confidence: 85,
        conflictReason: 'QC incoming inspection for Batch RM-2204 depends on the upstream Logistics delivery being completed first, but the delivery is blocked due to vendor customs delay.',
        issue_summary: 'The Quality Control inspection record for Batch RM-2204 is a downstream process that depends on the upstream Logistics delivery being fulfilled first. The Logistics delivery record is currently blocked — the vendor truck is held at customs with no confirmed ETA. The downstream QC inspection cannot proceed as the prerequisite delivery has not been fulfilled. This creates a sequential dependency conflict that will cascade into the production schedule if not resolved urgently.',
        ai_recommendation: 'Coordinate with Logistics to get an ETA from the vendor. If delay exceeds 2 hours, reschedule the QC inspection slot and notify Production to adjust Line B startup sequence. Consider sourcing from buffer stock as a contingency.',
        first_detected: new Date('2026-04-25T07:00:00').toISOString(),
        last_detected: new Date('2026-04-25T07:00:00').toISOString(),
        count: 1,
      },

      // ── Dependency-based clash 2: Production → Quality Control ──
      {
        conflictId: 'conflict_d2',
        recordA: 'record_prod_5',
        recordB: 'record_qc_3',
        departmentsInvolved: ['Production', 'Quality Control'],
        severity: 'Medium',
        status: 'active',
        statusType: 'urgent',
        confidence: 81,
        conflictReason: 'Final QC inspection for WO-2210 depends on the production run being completed, but Production has flagged a machine breakdown mid-run, blocking the downstream QC sequence.',
        issue_summary: 'Quality Control has a final inspection scheduled for WO-2210 output which requires the production run to be completed first as a prerequisite. However, Production has reported a breakdown on Machine M-07 mid-run, and the work order cannot be completed on schedule. The downstream QC inspection is now blocked and cannot proceed until the upstream production issue is resolved. If the breakdown extends beyond 4 hours, the shipment deadline for this batch will be missed.',
        ai_recommendation: 'Maintenance should prioritise Machine M-07 repair. QC should be notified to hold the inspection slot. If repair exceeds 4 hours, escalate to manager to decide on partial shipment or deadline renegotiation with the client.',
        first_detected: new Date('2026-04-25T11:00:00').toISOString(),
        last_detected: new Date('2026-04-25T11:00:00').toISOString(),
        count: 1,
      },
    ];

    for (const conflict of mockConflicts) {
      await db.collection('conflicts').doc(conflict.conflictId).set({
        ...conflict,
      });
    }

    return { message: 'Demo data seeded successfully' };
  }
}

module.exports = new StateManager();
