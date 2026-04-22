// Mock records for testing fallback conflict detection
const mockRecords = [
  {
    recordId: "rec_001",
    title: "Machine A Maintenance",
    equipment: "CNC Machine",
    location: "Floor A",
    shift: "Morning",
    department: "Maintenance",
    status: "active",
    date: "2024-04-23",
  },
  {
    recordId: "rec_002",
    title: "Production Job - Machine A",
    equipment: "CNC Machine",
    location: "Floor A",
    shift: "Morning",
    department: "Production",
    status: "active",
    date: "2024-04-23",
  },
  {
    recordId: "rec_003",
    title: "Conveyor Belt A Upgrade",
    equipment: "Conveyor Belt A",
    location: "Bay 1",
    shift: "Afternoon",
    department: "Maintenance",
    status: "active",
    date: "2024-04-22",
  },
  {
    recordId: "rec_004",
    title: "Assembly Work - Conveyor A",
    equipment: "Conveyor Belt A",
    location: "Bay 1",
    shift: "Afternoon",
    department: "Production",
    status: "active",
    date: "2024-04-22",
  },
];

module.exports = mockRecords;
