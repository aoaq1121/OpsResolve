export const ROLES = {
  data_entry: "Data Entry",
  supervisor: "Supervisor",
  manager: "Manager",
};

export const DEPARTMENTS = ["Production", "Maintenance", "Logistics", "Quality Control"];

// eslint-disable-next-line no-unused-vars
export function getVisibleTabs(role) {
  return {
    new: true,
    request: true,
    conflicts: true,
  };
}
