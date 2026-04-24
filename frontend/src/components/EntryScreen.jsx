import { ROLES, DEPARTMENTS } from "../constants/appConstants";

export function EntryScreen({ role, department, onRoleChange, onDepartmentChange, onContinue }) {
  return (
    <div className="entry-wrap">
      <div className="entry-card">
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, background: "#2563eb", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1.5" y="1.5" width="6.5" height="6.5" rx="1.5" fill="white" fillOpacity="0.9" />
              <rect x="10" y="1.5" width="6.5" height="6.5" rx="1.5" fill="white" fillOpacity="0.5" />
              <rect x="1.5" y="10" width="6.5" height="6.5" rx="1.5" fill="white" fillOpacity="0.5" />
              <rect x="10" y="10" width="6.5" height="6.5" rx="1.5" fill="white" fillOpacity="0.25" />
            </svg>
          </div>
          <h2 style={{ margin: 0 }}>OpsResolve</h2>
        </div>

        <p className="subtitle">Sign in to access your operational workspace.</p>

        <div className="field-group">
          <span className="field-label">Role</span>
          <select value={role} onChange={(e) => onRoleChange(e.target.value)}>
            <option value="">— Select role —</option>
            {Object.entries(ROLES).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <span className="field-label">Department</span>
          <select value={department} onChange={(e) => onDepartmentChange(e.target.value)}>
            <option value="">— Select department —</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>

        <button className="btn-primary" onClick={onContinue}>
          Continue →
        </button>
      </div>
    </div>
  );
}
