import { useEffect, useState } from "react";

const deptColors = {
  Production:        { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
  Maintenance:       { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  Logistics:         { bg: "#fffbeb", text: "#d97706", border: "#fed7aa" },
  "Quality Control": { bg: "#faf5ff", text: "#7c3aed", border: "#ddd6fe" },
  HR:                { bg: "#fce7f3", text: "#be185d", border: "#fbcfe8" },
  Finance:           { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  IT:                { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  Marketing:         { bg: "#fff7ed", text: "#9a3412", border: "#fed7aa" },
};

function ConfidenceMeter({ value }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { 
    const t = setTimeout(() => setWidth(value), 150); 
    return () => clearTimeout(t); 
  }, [value]);
  
  const color = value >= 80 ? "#22c55e" : value >= 60 ? "#f59e0b" : "#ef4444";
  const bg    = value >= 80 ? "#f0fdf4" : value >= 60 ? "#fffbeb" : "#fef2f2";
  const text  = value >= 80 ? "#16a34a" : value >= 60 ? "#d97706" : "#dc2626";
  
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>AI confidence</span>
        <span style={{ 
          fontSize: 12, fontWeight: 700, color: text, background: bg, 
          padding: "2px 10px", borderRadius: 100, border: `1px solid ${color}` 
        }}>
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
  useEffect(() => { 
    const t = setTimeout(onDone, 2500); 
    return () => clearTimeout(t); 
  }, [onDone]);
  
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
      <div style={{ 
        fontSize: 10, fontWeight: 700, color: "#94a3b8", 
        textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 
      }}>
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
  
  // Enhanced AI fields
  const deptA_action    = conflict.aiSummary?.deptA_action || null;
  const deptB_action    = conflict.aiSummary?.deptB_action || null;
  const timeline        = conflict.aiSummary?.timeline || null;
  const escalationNeeded = conflict.aiSummary?.escalationNeeded || false;

  useEffect(() => {
    const handleKeyDown = (e) => { 
      if (e.key === "Escape") onClose(); 
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function notify() {
    setToast("✅ All parties notified");
    // Optionally call API to update status
    if (conflict.conflictId) {
      try {
        await fetch(`http://localhost:5000/api/conflicts/${conflict.conflictId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "notified" })
        });
      } catch (err) {
        console.error("Failed to update status:", err);
      }
    }
  }

  async function schedule() {
    setToast("📅 Meeting scheduled");
    if (conflict.conflictId) {
      try {
        await fetch(`http://localhost:5000/api/conflicts/${conflict.conflictId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "scheduled" })
        });
      } catch (err) {
        console.error("Failed to update status:", err);
      }
    }
  }

  async function accept() {
    setLocalStatus("resolved");
    setToast("✅ Recommendation accepted — conflict resolved");
    
    // Save decision to backend
    try {
      await fetch("http://localhost:5000/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conflictId: conflict.conflictId,
          managerAction: "accepted",
          finalNote: "Accepted AI recommendation.",
          timestamp: new Date().toISOString()
        })
      });
    } catch (err) {
      console.error("Failed to save decision:", err);
    }
    
    onResolve && onResolve(conflict.conflictId, { 
      managerAction: "accepted", 
      finalNote: "Accepted AI recommendation." 
    });
    setTimeout(onClose, 1800);
  }

  async function confirmOverride() {
    if (!overrideReason) return;
    setLocalStatus("overridden");
    setShowOverride(false);
    setToast("⚠️ Override logged — conflict resolved");
    
    // Save override decision to backend
    try {
      await fetch("http://localhost:5000/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conflictId: conflict.conflictId,
          managerAction: "overridden",
          finalNote: finalNote || overrideReason,
          overrideReason: overrideReason,
          timestamp: new Date().toISOString()
        })
      });
    } catch (err) {
      console.error("Failed to save override:", err);
    }
    
    onResolve && onResolve(conflict.conflictId, { 
      managerAction: "overridden", 
      finalNote: finalNote || overrideReason 
    });
    setTimeout(onClose, 1800);
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popup" style={{ position: "relative", maxWidth: 560, width: "90%" }}>

        {/* Header */}
        <div className="popup-header">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, fontFamily: "monospace" }}>
                {conflict.conflictId}
              </span>
              <span className={`badge badge-${(conflict.severity || "medium").toLowerCase()}`}>
                {conflict.severity || "Medium"}
              </span>
              {escalationNeeded && (
                <span style={{ 
                  fontSize: 10, padding: "2px 8px", borderRadius: 100, 
                  background: "#fef3c7", color: "#d97706", fontWeight: 700,
                  border: "1px solid #fde68a"
                }}>
                  ⚠️ Escalation needed
                </span>
              )}
              {isResolved && (
                <span style={{ 
                  fontSize: 11, padding: "3px 10px", borderRadius: 100, 
                  background: "#f0fdf4", color: "#16a34a", fontWeight: 700, 
                  border: "1px solid #86efac" 
                }}>
                  {localStatus === "overridden" ? "Overridden" : "Resolved"}
                </span>
              )}
            </div>
            <h3 className="popup-title" style={{ fontSize: 18, margin: 0 }}>{conflictReason}</h3>
          </div>
          <button className="close-btn" onClick={onClose} style={{ 
            background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#94a3b8" 
          }}>×</button>
        </div>

        {/* Department pills + time */}
        <div style={{ display: "flex", gap: 7, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
          {departments.map((d) => {
            const c = deptColors[d] || { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
            return (
              <span key={d} style={{ 
                fontSize: 12, padding: "4px 12px", borderRadius: 100, 
                background: c.bg, color: c.text, fontWeight: 600, 
                border: `1px solid ${c.border}` 
              }}>{d}</span>
            );
          })}
          <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto", fontWeight: 500 }}>
            {conflict.reportedAt}
          </span>
        </div>

        {/* Conflicting records */}
        <p className="section-label" style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>
          CONFLICTING RECORDS
        </p>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <RecordBlock recordId={conflict.recordA} label="Record A" />
          <RecordBlock recordId={conflict.recordB} label="Record B" />
        </div>

        {/* AI Summary */}
        <p className="section-label" style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>
          AI ANALYSIS
        </p>
        <div className="ai-block" style={{ 
          background: "#f0fdf4", borderRadius: 12, padding: "14px 16px", 
          border: "1px solid #86efac", marginBottom: 16 
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
            <div style={{ 
              width: 20, height: 20, borderRadius: "50%", background: "#22c55e", 
              display: "flex", alignItems: "center", justifyContent: "center" 
            }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M2 5.5l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              AI summary
            </span>
          </div>
          <p className="ai-text" style={{ fontSize: 14, color: "#166534", lineHeight: 1.5, margin: 0 }}>
            {aiSummaryText}
          </p>
        </div>

        {/* AI Recommendation - Enhanced Section */}
        <p className="section-label" style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>
          AI RECOMMENDATION
        </p>
        <div className="rec-block" style={{ 
          background: "#eff6ff", borderRadius: 12, padding: "16px", 
          border: "1px solid #bfdbfe", marginBottom: 16 
        }}>
          <p style={{ fontSize: 14, color: "#1e3a8a", lineHeight: 1.6, marginBottom: 12, fontWeight: 500 }}>
            {recommendation}
          </p>
          
          {/* Department-specific actions */}
          {(deptA_action || deptB_action) && (
            <div style={{ 
              marginTop: 12, 
              padding: 12, 
              background: "#ffffff", 
              borderRadius: 10,
              border: "1px solid #bfdbfe"
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase" }}>
                Department Actions
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {deptA_action && departments[0] && (
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <span style={{ 
                      fontSize: 11, fontWeight: 700, color: "#2563eb", 
                      display: "block", marginBottom: 6 
                    }}>
                      📌 {departments[0]}:
                    </span>
                    <p style={{ fontSize: 13, color: "#0f1923", margin: 0, lineHeight: 1.4 }}>
                      {deptA_action}
                    </p>
                  </div>
                )}
                {deptB_action && departments[1] && (
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <span style={{ 
                      fontSize: 11, fontWeight: 700, color: "#7c3aed", 
                      display: "block", marginBottom: 6 
                    }}>
                      📌 {departments[1]}:
                    </span>
                    <p style={{ fontSize: 13, color: "#0f1923", margin: 0, lineHeight: 1.4 }}>
                      {deptB_action}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Timeline */}
          {timeline && (
            <div style={{ 
              marginTop: 12, 
              fontSize: 12, 
              color: "#d97706", 
              background: "#fffbeb", 
              padding: "8px 12px", 
              borderRadius: 8,
              border: "1px solid #fde68a",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}>
              <span>⏰</span>
              <span><strong>Timeline:</strong> {timeline}</span>
            </div>
          )}
          
          <ConfidenceMeter value={confidence} />
        </div>

        {/* Read-only notice */}
        {isReadOnly && (
          <div style={{ 
            marginTop: 16, padding: 12, background: "#f1f5f9", 
            borderRadius: 10, textAlign: "center", fontSize: 12, color: "#64748b" 
          }}>
            🔒 View only — actions require Supervisor or Manager access.
          </div>
        )}

        {/* Action Buttons */}
        {isSupervisorPlus && !isResolved && !showOverride && (
           <div className="popup-actions" style={{ 
              display: "flex", 
              gap: 12, 
              marginTop: 20, 
              marginBottom: 10,
              flexWrap: "wrap" 
            }}>
              <button 
                onClick={notify} 
                style={{ 
                  flex: 1, 
                  padding: "12px 20px", 
                  borderRadius: 10, 
                  border: "1px solid #cbd5e1",
                  background: "#ffffff", 
                  fontSize: 14, 
                  fontWeight: 600, 
                  cursor: "pointer",
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: 8,
                  color: "#1e293b",  // ← IMPORTANT: dark text color
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
              >
                <span style={{ fontSize: 16 }}>📢</span> 
                Notify All
              </button>
              
              <button 
                onClick={schedule} 
                style={{ 
                  flex: 1, 
                  padding: "12px 20px", 
                  borderRadius: 10, 
                  border: "1px solid #cbd5e1",
                  background: "#ffffff", 
                  fontSize: 14, 
                  fontWeight: 600, 
                  cursor: "pointer",
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: 8,
                  color: "#1e293b",  // ← IMPORTANT: dark text color
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
              >
                <span style={{ fontSize: 16 }}>📅</span> 
                Schedule Meeting
              </button>
              
              {isManager && (
                <>
                  <button 
                    onClick={accept} 
                    style={{ 
                      flex: 1, 
                      padding: "12px 20px", 
                      borderRadius: 10, 
                      border: "none",
                      background: "#22c55e", 
                      fontSize: 14, 
                      fontWeight: 600, 
                      cursor: "pointer",
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: 8,
                      color: "#ffffff",  // ← White text on green background
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#16a34a"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#22c55e"}
                  >
                    <span style={{ fontSize: 16 }}>✅</span> 
                    Accept Recommendation
                  </button>
                  
                  <button 
                    onClick={() => setShowOverride(true)} 
                    style={{ 
                      flex: 1, 
                      padding: "12px 20px", 
                      borderRadius: 10, 
                      border: "1.5px solid #dc2626",
                      background: "#ffffff", 
                      fontSize: 14, 
                      fontWeight: 600, 
                      cursor: "pointer",
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: 8,
                      color: "#dc2626",  // ← Red text for override button
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#fef2f2";
                      e.currentTarget.style.color = "#b91c1c";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#ffffff";
                      e.currentTarget.style.color = "#dc2626";
                    }}
                  >
                    <span style={{ fontSize: 16 }}>⚠️</span> 
                    Override
                  </button>
                </>
              )}
            </div>
        )}

        {/* Override panel */}
        {showOverride && (
          <div style={{ 
            marginTop: 18, background: "#fef2f2", border: "1.5px solid #fecaca", 
            borderRadius: 12, padding: "16px 18px", animation: "fadeUp 0.2s ease" 
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", marginBottom: 12 }}>
              Override reason
            </p>
            <select 
              value={overrideReason} 
              onChange={(e) => setOverrideReason(e.target.value)} 
              style={{ 
                width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e2e8f0",
                marginBottom: 10, fontSize: 13
              }}
            >
              <option value="">Select a reason...</option>
              <option>Operational constraints not captured by AI</option>
              <option>New information received</option>
              <option>Safety override</option>
              <option>Management directive</option>
              <option>Emergency situation</option>
              <option>Other</option>
            </select>
            <textarea 
              value={finalNote} 
              onChange={(e) => setFinalNote(e.target.value)} 
              placeholder="Final note (logged with this decision)..." 
              style={{ 
                width: "100%", minHeight: 76, padding: "10px", borderRadius: 8,
                border: "1px solid #e2e8f0", resize: "vertical", marginBottom: 12, fontSize: 13
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button 
                onClick={() => setShowOverride(false)} 
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmOverride} 
                style={{ 
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  background: "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 600,
                  opacity: overrideReason ? 1 : 0.4
                }} 
                disabled={!overrideReason}
              >
                Confirm override
              </button>
            </div>
          </div>
        )}

        {/* Resolved decision display */}
        {isResolved && conflict.decision && (
          <div style={{ 
            marginTop: 18, background: "#f0fdf4", border: "1.5px solid #86efac", 
            borderRadius: 12, padding: "14px 16px" 
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              Decision record
            </p>
            <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.6 }}>
              <span style={{ fontWeight: 700 }}>Action: </span>
              {conflict.decision.managerAction === "accepted" ? "Accepted AI recommendation" : "Overridden by manager"}
            </div>
            {conflict.decision.finalNote && (
              <div style={{ fontSize: 12, color: "#166534", marginTop: 5 }}>
                <span style={{ fontWeight: 700 }}>Note: </span>
                {conflict.decision.finalNote}
              </div>
            )}
          </div>
        )}

        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </div>
      
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .popup {
          background: white;
          border-radius: 20px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.2);
        }
        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px 20px 12px 20px;
          border-bottom: 1px solid #e2e8f0;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #94a3b8;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        .close-btn:hover {
          background: #f1f5f9;
          color: #475569;
        }
        .badge {
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
        }
        .badge-high {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        .badge-medium {
          background: #fffbeb;
          color: #d97706;
          border: 1px solid #fde68a;
        }
        .badge-low {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
        }
        .section-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin: 0 20px 8px 20px;
        }
      `}</style>
    </div>
  );
}