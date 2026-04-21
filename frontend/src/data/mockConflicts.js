// ── Records ──────────────────────────────────────────────────────────────────
export const mockRecords = [
  {
    recordId: "REC-001",
    department: "Production",
    role: "Supervisor",
    title: "Line A shutdown request",
    description: "Line A must complete order #4821 by end of shift Friday. Any downtime this week puts the deadline at serious risk.",
    value: "Order #4821 — 500 units by Friday 18:00",
    timestamp: "2024-05-20T09:14:00",
  },
  {
    recordId: "REC-002",
    department: "Maintenance",
    role: "Supervisor",
    title: "Machine M-07 service window",
    description: "Machine M-07 shows critical wear indicators. Failure to service now risks full breakdown — estimated 3-day repair vs. 4-hour planned window.",
    value: "4-hour maintenance window required this week",
    timestamp: "2024-05-20T09:31:00",
  },
  {
    recordId: "REC-003",
    department: "Logistics",
    role: "Data Entry",
    title: "Bay 3 delivery booking",
    description: "Inbound delivery for supplier DEF requires Bay 3 access 08:00–14:00 Thursday. Cannot reschedule — carrier contract terms.",
    value: "Bay 3 — Thursday 08:00–14:00",
    timestamp: "2024-05-20T07:02:00",
  },
  {
    recordId: "REC-004",
    department: "Quality Control",
    role: "Supervisor",
    title: "Batch #991 QC inspection",
    description: "QC inspection for batch #991 must use Bay 3 equipment Thursday AM. Rescheduling risks compliance deadline.",
    value: "Bay 3 equipment — Thursday AM",
    timestamp: "2024-05-20T07:45:00",
  },
];

// ── Conflicts ─────────────────────────────────────────────────────────────────
const mockConflicts = [
  {
    conflictId: "CON-001",
    recordA: "REC-001",
    recordB: "REC-002",
    departmentsInvolved: ["Production", "Maintenance"],
    conflictReason: "Both departments require exclusive machine access during the same window on Friday.",
    severity: "High",
    reportedAt: "2h ago",
    status: "open",
    statusType: "urgent",
    aiSummary:
      "Competing urgency between a time-sensitive production order and a preventive maintenance window. Maintenance data suggests delaying servicing beyond 48h significantly increases failure probability.",
    recommendation:
      "Prioritise maintenance window — reschedule production to Shift B Thursday",
    confidence: 87,
    decision: null,
  },
  {
    conflictId: "CON-002",
    recordA: "REC-003",
    recordB: "REC-004",
    departmentsInvolved: ["Logistics", "Quality Control"],
    conflictReason: "Both departments require Bay 3 access on Thursday morning with no overlap capacity.",
    severity: "Medium",
    reportedAt: "5h ago",
    status: "in_progress",
    statusType: "progress",
    aiSummary:
      "Both departments require exclusive Bay 3 access on Thursday morning. Neither can easily reschedule without operational or compliance impact.",
    recommendation:
      "Split Bay 3 window — Logistics AM slot (08:00–11:00), QC PM slot (13:00–16:00)",
    confidence: 72,
    decision: null,
  },
  {
    conflictId: "CON-003",
    recordA: "REC-001",
    recordB: "REC-003",
    departmentsInvolved: ["Production", "Logistics"],
    conflictReason: "Staffing demand from Production conflicts with Logistics commitment on Friday.",
    severity: "Low",
    reportedAt: "1d ago",
    status: "pending",
    statusType: "pending",
    aiSummary:
      "Limited cross-trained personnel available. Both teams have valid Friday commitments that cannot be fully met with current headcount.",
    recommendation:
      "Request temporary agency cover for 2 staff — split remaining headcount evenly",
    confidence: 61,
    decision: null,
  },
];

export default mockConflicts;
