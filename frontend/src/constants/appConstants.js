export const ROLES = {
  data_entry: "Data Entry",
  supervisor: "Supervisor",
  manager: "Manager",
};

export const DEPARTMENTS = ["Production", "Maintenance", "Logistics", "Quality Control"];

export function getVisibleTabs(role) {
  return {
    new: true,
    conflicts: true,
    decisions: role === "manager",
    reviews: role === "manager",
  };
}
