// src/utils/conflictUtils.js

export const deptColors = {
  Production:        { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
  Maintenance:       { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  Logistics:         { bg: "#fffbeb", text: "#d97706", border: "#fed7aa" },
  "Quality Control": { bg: "#faf5ff", text: "#7c3aed", border: "#ddd6fe" },
  HR:                { bg: "#fce7f3", text: "#be185d", border: "#fbcfe8" },
  Finance:           { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  IT:                { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  Marketing:         { bg: "#fff7ed", text: "#9a3412", border: "#fed7aa" },
  "RESOURCE ALLOCATION": { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
  "EMERGENCY": { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
};

export const conflictCategories = {
  time: {
    label: "Time-based clash",
    desc: "Overlapping schedules",
    bg: "#fffbeb", text: "#d97706", border: "#fde68a",
    keywords: ["schedul", "consecutive", "overlap", "same day", "same shift", "same time", "duplicate", "redundant", "back-to-back", "simultaneous", "date", "shift", "morning", "afternoon", "night"],
  },
  resource: {
    label: "Resource-based clash",
    desc: "Same machine, equipment or manpower",
    bg: "#fef2f2", text: "#dc2626", border: "#fecaca",
    keywords: ["machine", "equipment", "manpower", "forklift", "vehicle", "tool", "bay", "line", "asset", "same resource", "same equipment", "same machine"],
  },
  dependency: {
    label: "Dependency-based clash",
    desc: "Downstream process depends on conflicting upstream record",
    bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe",
    keywords: ["depend", "downstream", "upstream", "prerequisite", "blocked", "waiting on", "requires", "before", "after", "sequence", "chain", "prior"],
  },
};

export function detectConflictCategories(text, conflictReason) {
  const combined = `${text || ""} ${conflictReason || ""}`.toLowerCase();
  return Object.entries(conflictCategories)
    .filter(([, cat]) => cat.keywords.some((kw) => combined.includes(kw)))
    .map(([key]) => key);
}

export function parsePoints(text) {
  if (!text || text === "—") return [];
  return text.split(/(?<=[.!?])\s+|;\s*/).map((s) => s.trim()).filter((s) => s.length > 10);
}

export function makeShortTitle(conflictReason, departments) {
  if (!conflictReason || conflictReason === "Conflict detected" || conflictReason === "Resource or schedule overlap detected") {
    return departments && departments.length >= 2
      ? `${departments[0]} vs ${departments[1]} — scheduling conflict`
      : "Operational conflict detected";
  }
  const equipMatch = conflictReason.match(/Machine\s[\w-]+|Bay\s\d+|Line\s[AB\d]+|Forklift\s[\w-]+/i);
  const equip = equipMatch ? equipMatch[0] : null;
  if (equip && departments && departments.length >= 2) return `${equip} — ${departments[0]} vs ${departments[1]}`;
  if (departments && departments.length >= 2) return `${departments[0]} vs ${departments[1]} — scheduling conflict`;
  return conflictReason.length > 65 ? conflictReason.substring(0, 62) + "..." : conflictReason;
}