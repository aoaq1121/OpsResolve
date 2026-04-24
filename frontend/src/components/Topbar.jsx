import { ROLES } from "../constants/appConstants";

export function Topbar({ role, department, openConflictCount, onLogout }) {
  const avatarInitials = ROLES[role]
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="topbar">
      <div className="topbar-logo">
        <div className="topbar-logo-mark">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.9" />
            <rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
            <rect x="1" y="9" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
            <rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.25" />
          </svg>
        </div>
        <span className="topbar-title">OpsResolve</span>
      </div>

      {openConflictCount > 0 && (
        <div className="stat-chip">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1.5s infinite" }} />
          <strong>{openConflictCount}</strong> active conflict{openConflictCount !== 1 ? "s" : ""}
        </div>
      )}

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <div className="user-pill">
          <div className="avatar">{avatarInitials}</div>
          <span>{ROLES[role]} · {department}</span>
        </div>
        <button className="logout-btn" onClick={onLogout}>Sign out</button>
      </div>
    </div>
  );
}
