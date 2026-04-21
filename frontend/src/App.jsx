import { useState } from "react";
import "./App.css";
import ActiveConflicts from "./components/ActiveConflicts";
import mockConflicts from "./data/mockConflicts";
import { analyzeConflict } from "./services/aiService";

async function handleSubmit(input) {
  const result = await analyzeConflict({
    user_input: input,
    department: "Production"
  });

  console.log(result);
}
const ROLES = {
  data_entry: "Data Entry",
  supervisor: "Supervisor",
  manager:    "Manager",
};

const DEPARTMENTS = ["Production", "Maintenance", "Logistics", "Quality Control"];

function getVisibleTabs(role) {
  return {
    new:       true,
    conflicts: true,
    decisions: role === "manager",
  };
}

// ── Conflict Detected Modal ───────────────────────────────────────────────────
function ConflictDetectedModal({ conflict, onViewDetails, onDismiss }) {
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onDismiss()}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "2rem",
        width: "100%", maxWidth: 460,
        border: "1.5px solid #fecaca",
        animation: "slideIn 0.25s cubic-bezier(0.34,1.2,0.64,1)",
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "#fef2f2", border: "2px solid #fecaca",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 7v5M11 15.5v.5" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M9.27 3.5L2 17a2 2 0 001.73 3h14.54A2 2 0 0020 17L12.73 3.5a2 2 0 00-3.46 0z" stroke="#dc2626" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f1923", letterSpacing: "-0.01em" }}>Conflict Detected</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Your record conflicts with an existing entry</div>
          </div>
        </div>

        <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{conflict.conflictId}</span>
            <span className={`badge badge-${conflict.severity.toLowerCase()}`}>{conflict.severity}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f1923", marginBottom: 8, lineHeight: 1.4 }}>{conflict.conflictReason}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {conflict.departmentsInvolved.map((d) => (
              <span key={d} className="dept-tag">{d}</span>
            ))}
          </div>
        </div>

        <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>AI Recommendation</div>
          <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.55 }}>{conflict.recommendation}</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={onDismiss} style={{ flex: 1 }}>Dismiss</button>
          <button className="btn btn-submit" onClick={onViewDetails} style={{ flex: 2 }}>View Conflict Details →</button>
        </div>
      </div>
    </div>
  );
}

// ── New Record tab ────────────────────────────────────────────────────────────
function NewRecord({ onViewConflicts }) {
  const [form, setForm] = useState({
    title: "", category: "", location: "", equipment: "",
    priority: "Normal", shift: "Morning", date: "", duration: "", impact: "", description: "",
  });
  const [detectedConflict, setDetectedConflict] = useState(null);

  function handleChange(field, val) { setForm((p) => ({ ...p, [field]: val })); }

  function handleSubmit() {
    if (!form.title || !form.category || !form.description) {
      alert("Please fill in Title, Category and Description.");
      return;
    }
    setDetectedConflict(mockConflicts[0]);
  }

  function reset() {
    setForm({ title: "", category: "", location: "", equipment: "", priority: "Normal", shift: "Morning", date: "", duration: "", impact: "", description: "" });
    setDetectedConflict(null);
  }

  const openCount = mockConflicts.filter((c) => c.status !== "resolved").length;

  return (
    <div style={{ padding: "1.75rem", width: "100%" }}>

      {/* Page header row: title left, button right */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <h2 className="section-title">New Operational Record</h2>
        <button className="btn-view-conflicts" onClick={onViewConflicts}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 6 }}>
            <path d="M7 1.5A3.5 3.5 0 003.5 5v2L2.5 9h9L10.5 7V5A3.5 3.5 0 007 1.5zM5.5 11a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          View Active Conflicts
          {openCount > 0 && (
            <span style={{
              marginLeft: 7, background: "#ef4444", color: "#fff",
              fontSize: 10, fontWeight: 700, padding: "1px 7px",
              borderRadius: 100,
            }}>
              {openCount}
            </span>
          )}
        </button>
      </div>

      {/* Form box — full width, landscape grid inside */}
      <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "1.75rem 2rem", width: "100%" }}>

        {/* Row 1: Basic Info — 4 columns across */}
        <div className="form-section-label">Basic Information</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
          <div className="form-group">
            <label>Title <span className="required">*</span></label>
            <input type="text" placeholder="e.g. Machine M-07 service request" value={form.title} onChange={(e) => handleChange("title", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Category <span className="required">*</span></label>
            <select value={form.category} onChange={(e) => handleChange("category", e.target.value)}>
              <option value="">— Select —</option>
              <option>Maintenance Request</option>
              <option>Production Log</option>
              <option>Incident Report</option>
              <option>Quality Check</option>
              <option>Resource Allocation</option>
              <option>Schedule Change</option>
              <option>Equipment Fault</option>
            </select>
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={form.priority} onChange={(e) => handleChange("priority", e.target.value)}>
              <option>Normal</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>
          <div className="form-group">
            <label>Shift</label>
            <select value={form.shift} onChange={(e) => handleChange("shift", e.target.value)}>
              <option>Morning</option>
              <option>Afternoon</option>
              <option>Night</option>
            </select>
          </div>
        </div>

        {/* Row 2: Location & Schedule — 4 columns */}
        <div className="form-section-label">Location, Equipment & Schedule</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
          <div className="form-group">
            <label>Location / Area</label>
            <select value={form.location} onChange={(e) => handleChange("location", e.target.value)}>
              <option value="">— Select —</option>
              <option>Line A</option>
              <option>Line B</option>
              <option>Bay 1</option>
              <option>Bay 2</option>
              <option>Bay 3</option>
              <option>Warehouse</option>
              <option>Loading Dock</option>
              <option>Control Room</option>
            </select>
          </div>
          <div className="form-group">
            <label>Equipment / Asset</label>
            <select value={form.equipment} onChange={(e) => handleChange("equipment", e.target.value)}>
              <option value="">— Select —</option>
              <option>Machine M-01</option>
              <option>Machine M-07</option>
              <option>Machine M-12</option>
              <option>Conveyor Belt A</option>
              <option>Forklift F-03</option>
              <option>QC Station 1</option>
              <option>QC Station 2</option>
              <option>N/A</option>
            </select>
          </div>
          <div className="form-group">
            <label>Date Required</label>
            <input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Estimated Duration</label>
            <select value={form.duration} onChange={(e) => handleChange("duration", e.target.value)}>
              <option value="">— Select —</option>
              <option>Less than 1 hour</option>
              <option>1–2 hours</option>
              <option>2–4 hours</option>
              <option>4–8 hours</option>
              <option>Full day</option>
              <option>Multi-day</option>
            </select>
          </div>
        </div>

        {/* Row 3: Impact + Description side by side */}
        <div className="form-section-label">Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 14, marginBottom: 4 }}>
          <div className="form-group">
            <label>Operational Impact</label>
            <select value={form.impact} onChange={(e) => handleChange("impact", e.target.value)}>
              <option value="">— Select —</option>
              <option>No disruption</option>
              <option>Minor disruption</option>
              <option>Partial shutdown</option>
              <option>Full line stop</option>
            </select>
          </div>
          <div className="form-group">
            <label>Description <span className="required">*</span></label>
            <textarea
              placeholder="Describe the operational situation, requirements, and any constraints in detail..."
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              style={{ minHeight: 90 }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button className="btn btn-cancel-form" onClick={reset}>Clear</button>
          <button className="btn btn-submit" onClick={handleSubmit}>Submit Record</button>
        </div>
      </div>

      {detectedConflict && (
        <ConflictDetectedModal
          conflict={detectedConflict}
          onViewDetails={() => { setDetectedConflict(null); onViewConflicts(); }}
          onDismiss={() => { setDetectedConflict(null); reset(); }}
        />
      )}
    </div>
  );
}

// ── Decision Review placeholder ───────────────────────────────────────────────
function DecisionReview() {
  return (
    <div style={{ padding: "1.75rem" }}>
      <h2 className="section-title" style={{ marginBottom: "1rem" }}>Decision Review</h2>
      <p style={{ color: "#94a3b8", fontSize: 14 }}>Decision Review — implemented by team member (Person 4).</p>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,     setScreen]     = useState("entry");
  const [role,       setRole]       = useState("");
  const [department, setDepartment] = useState("");
  const [activeTab,  setActiveTab]  = useState("new");

  const openConflictCount = mockConflicts.filter((c) => c.status !== "resolved").length;
  const tabs = getVisibleTabs(role);
  const avatarInitials = ROLES[role]?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  function handleContinue() {
    if (!role || !department) { alert("Please select both role and department."); return; }
    setActiveTab("new");
    setScreen("workspace");
  }

  function handleLogout() { setScreen("entry"); setRole(""); setDepartment(""); }

  if (screen === "entry") {
    return (
      <div className="entry-wrap">
        <div className="entry-card">
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, background: "#2563eb", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6.5" height="6.5" rx="1.5" fill="white" fillOpacity="0.9"/>
                <rect x="10" y="1.5" width="6.5" height="6.5" rx="1.5" fill="white" fillOpacity="0.5"/>
                <rect x="1.5" y="10" width="6.5" height="6.5" rx="1.5" fill="white" fillOpacity="0.5"/>
                <rect x="10" y="10" width="6.5" height="6.5" rx="1.5" fill="white" fillOpacity="0.25"/>
              </svg>
            </div>
            <h2 style={{ margin: 0 }}>OpsResolve</h2>
          </div>
          <p className="subtitle">Sign in to access your operational workspace.</p>
          <div className="field-group">
            <span className="field-label">Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">— Select role —</option>
              {Object.entries(ROLES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>
          <div className="field-group">
            <span className="field-label">Department</span>
            <select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">— Select department —</option>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={handleContinue}>Continue →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-logo">
          <div className="topbar-logo-mark">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.9"/>
              <rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5"/>
              <rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.25"/>
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
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </div>

      <div className="tabs">
        {tabs.new && (
          <div className={`tab ${activeTab === "new" ? "active" : ""}`} onClick={() => setActiveTab("new")}>
            New Record
          </div>
        )}
        {tabs.conflicts && (
          <div className={`tab ${activeTab === "conflicts" ? "active" : ""}`} onClick={() => setActiveTab("conflicts")}>
            Active Conflicts
            {openConflictCount > 0 && <span className="tab-badge">{openConflictCount}</span>}
          </div>
        )}
        {tabs.decisions && (
          <div className={`tab ${activeTab === "decisions" ? "active" : ""}`} onClick={() => setActiveTab("decisions")}>
            Decision Review
          </div>
        )}
      </div>

      {activeTab === "new"       && <NewRecord onViewConflicts={() => setActiveTab("conflicts")} />}
      {activeTab === "conflicts" && <ActiveConflicts role={role} />}
      {activeTab === "decisions" && <DecisionReview />}
    </div>
  );
}
