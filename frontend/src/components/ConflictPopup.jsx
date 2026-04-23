import { useEffect, useState } from "react";

const deptColors = {
  Production:        { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
  Maintenance:       { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  Logistics:         { bg: "#fffbeb", text: "#d97706", border: "#fed7aa" },
  "Quality Control": { bg: "#faf5ff", text: "#7c3aed", border: "#ddd6fe" },
};

function ConfidenceMeter({ value }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(value), 150); return () => clearTimeout(t); }, [value]);
  const color = value >= 80 ? "#22c55e" : value >= 60 ? "#f59e0b" : "#ef4444";
  const bg    = value >= 80 ? "#f0fdf4" : value >= 60 ? "#fffbeb" : "#fef2f2";
  const text  = value >= 80 ? "#16a34a" : value >= 60 ? "#d97706" : "#dc2626";
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>AI confidence</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: text, background: bg, padding: "2px 10px", borderRadius: 100, border: `1px solid ${color}` }}>
          {value}%
        </span>
      </div>
      <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${width}%`, background: color,
          borderRadius: 3, transition: "width 0.75s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
}

function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)",
      background: "#0f1923", color: "#f8fafc", padding: "10px 22px",
      borderRadius: 100, fontSize: 14, fontWeight: 600,
      whiteSpace: "nowrap", zIndex: 20, animation: "fadeUp 0.2s ease",
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    }}>{message}</div>
  );
}

function RecordBlock({ recordId, label }) {
  if (!recordId || recordId === "—") return null;
  return (
    <div style={{
      flex: 1, background: "#f8fafc", border: "1.5px solid #e2e8f0",
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f1923" }}>{recordId}</div>
    </div>
  );
}

export default function ConflictPopup({ conflict, role, onClose, onResolve }) {
  const [toast, setToast]                   = useState(null);
  const [showOverride, setShowOverride]     = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [finalNote, setFinalNote]           = useState("");
  const [localStatus, setLocalStatus]       = useState(conflict.status);

  const isReadOnly       = role === "data_entry";
  const isSupervisorPlus = role === "supervisor" || role === "manager";
  const isManager        = role === "manager";
  const isResolved       = localStatus === "resolved" || localStatus === "overridden";

  // Normalise fields — handle both Firebase format and mock format
  const conflictReason  = conflict.conflictReason || conflict.issue_summary || "Conflict detected";
  const aiSummaryText   = typeof conflict.aiSummary === "string"
    ? conflict.aiSummary
    : conflict.aiSummary?.conflictReason || conflict.issue_summary || "—";
  const recommendation  = conflict.recommendation ||
    (typeof conflict.aiSummary === "object" ? conflict.aiSummary?.recommendation : null) ||
    conflict.ai_recommendation || "—";
  const confidence      = conflict.confidence || 0;
  const departments     = conflict.departmentsInvolved || [];

  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  function notify()   { setToast("All parties notified"); }
  function schedule() { setToast("Meeting scheduled"); }

  function accept() {
    setLocalStatus("resolved");
    setToast("Recommendation accepted — conflict resolved");
    onResolve && onResolve(conflict.conflictId, { managerAction: "accepted", finalNote: "Accepted AI recommendation." });
    setTimeout(onClose, 1800);
  }

  function confirmOverride() {
    if (!overrideReason) return;
    setLocalStatus("overridden");
    setShowOverride(false);
    setToast("Override logged — conflict resolved");
    onResolve && onResolve(conflict.conflictId, { managerAction: "overridden", finalNote: finalNote || overrideReason });
    setTimeout(onClose, 1800);
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popup" style={{ position: "relative" }}>

        {/* Header */}
        <div className="popup-header">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>{conflict.conflictId}</span>
              <span className={`badge badge-${(conflict.severity || "medium").toLowerCase()}`}>{conflict.severity || "Medium"}</span>
              {isResolved && (
                <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 100, background: "#f0fdf4", color: "#16a34a", fontWeight: 700, border: "1px solid #86efac" }}>
                  {localStatus === "overridden" ? "Overridden" : "Resolved"}
                </span>
              )}
            </div>
            <h3 className="popup-title">{conflictReason}</h3>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Dept pills + time */}
        <div style={{ display: "flex", gap: 7, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
          {departments.map((d) => {
            const c = deptColors[d] || {};
            return (
              <span key={d} style={{ fontSize: 13, padding: "4px 12px", borderRadius: 100, background: c.bg || "#f1f5f9", color: c.text || "#475569", fontWeight: 600, border: `1px solid ${c.border || "#e2e8f0"}` }}>{d}</span>
            );
          })}
          <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto", fontWeight: 500 }}>{conflict.reportedAt}</span>
        </div>

        {/* Conflicting records */}
        <p className="section-label">Conflicting records</p>
        <div style={{ display: "flex", gap: 12, marginBottom: 4 }}>
          <RecordBlock recordId={conflict.recordA} label="Record A" />
          <RecordBlock recordId={conflict.recordB} label="Record B" />
        </div>

        {/* AI Summary */}
        <p className="section-label">AI analysis</p>
        <div className="ai-block">
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M2 5.5l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.07em" }}>AI summary</span>
          </div>
          <p className="ai-text">{aiSummaryText}</p>
        </div>

        {/* Recommendation */}
        <p className="section-label">Recommendation</p>
        <div className="rec-block">
          <p style={{ fontSize: 14, color: "#0f1923", lineHeight: 1.65, marginBottom: 2, fontWeight: 500 }}>{recommendation}</p>
          <ConfidenceMeter value={confidence} />
        </div>

        {isReadOnly && <p className="readonly-note">View only — actions require Supervisor or Manager access.</p>}

        {/* Actions */}
        {isSupervisorPlus && !isResolved && !showOverride && (
          <div className="popup-actions">
            <button className="btn btn-secondary" onClick={notify}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 6 }}>
                <path d="M7 1.5A3.5 3.5 0 003.5 5v2L2.5 9h9L10.5 7V5A3.5 3.5 0 007 1.5zM5.5 11a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Notify all
            </button>
            <button className="btn btn-secondary" onClick={schedule}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 6 }}>
                <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M1.5 5.5h11M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Schedule meeting
            </button>
            {isManager && (
              <>
                <button className="btn btn-accept" onClick={accept}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 6 }}>
                    <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Accept recommendation
                </button>
                <button className="btn btn-override" onClick={() => setShowOverride(true)}>Override</button>
              </>
            )}
          </div>
        )}

        {/* Override panel */}
        {showOverride && (
          <div style={{ marginTop: 18, background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 12, padding: "16px 18px", animation: "fadeUp 0.2s ease" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", marginBottom: 12 }}>Override reason</p>
            <select value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} style={{ marginBottom: 10 }}>
              <option value="">Select a reason...</option>
              <option>Operational constraints not captured by AI</option>
              <option>New information received</option>
              <option>Safety override</option>
              <option>Management directive</option>
              <option>Other</option>
            </select>
            <textarea value={finalNote} onChange={(e) => setFinalNote(e.target.value)} placeholder="Final note (logged with this decision)..." style={{ minHeight: 76, resize: "vertical", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setShowOverride(false)}>Cancel</button>
              <button className="btn btn-override" onClick={confirmOverride} style={{ opacity: overrideReason ? 1 : 0.4 }} disabled={!overrideReason}>
                Confirm override
              </button>
            </div>
          </div>
        )}

        {/* Resolved decision */}
        {isResolved && conflict.decision && (
          <div style={{ marginTop: 18, background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Decision record</p>
            <div style={{ fontSize: 14, color: "#166534", lineHeight: 1.6 }}>
              <span style={{ fontWeight: 700 }}>Action: </span>{conflict.decision.managerAction}
            </div>
            {conflict.decision.finalNote && (
              <div style={{ fontSize: 13, color: "#166534", marginTop: 5 }}>
                <span style={{ fontWeight: 700 }}>Note: </span>{conflict.decision.finalNote}
              </div>
            )}
          </div>
        )}

        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </div>
    </div>
  );
}
