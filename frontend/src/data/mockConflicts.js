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
// Conflicts are now fetched from Firebase via API
export default [];
