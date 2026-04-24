import { useEffect, useState } from "react";
import { deptColors, conflictCategories, detectConflictCategories, parsePoints, makeShortTitle } from "../utils/conflictUtils";
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
        <span style={{ fontSize: 12, fontWeight: 700, color: text, background: bg, padding: "2px 10px", borderRadius: 100, border: `1px solid ${color}` }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${width}%`, background: color, borderRadius: 3, transition: "width 0.75s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", background: "#0f1923", color: "#f8fafc", padding: "10px 22px", borderRadius: 100, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", zIndex: 20, animation: "fadeUp 0.2s ease", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>{message}</div>
  );
}

function RecordCard({ recordId, record, department }) {
  const c = deptColors[department] || { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" };
  const displayId = record?.id || record?.recordId || recordId;
  const title = record?.title || null;
  const location = record?.location || record?.bay || null;
  const equipment = record?.equipment || record?.equipmentId || null;
  const shift = record?.shift || null;
  const date = record?.date || null;
  const processType = record?.processType || record?.maintenanceType || record?.inspectionType || record?.requestType || null;
  const workOrderNo = record?.workOrderNo || record?.batchRef || record?.poNumber || null;

  return (
    <div style={{ flex: 1, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{displayId}</span>
        {department && (
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: c.bg, color: c.text, fontWeight: 600, border: `1px solid ${c.border}` }}>{department}</span>
        )}
      </div>
      {title && <div style={{ fontSize: 14, fontWeight: 700, color: "#0f1923", marginBottom: 8, textAlign: "left" }}>{title}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {workOrderNo && <div style={{ fontSize: 13, color: "#475569", textAlign: "left" }}><span style={{ fontWeight: 600, color: "#64748b" }}>Ref: </span>{workOrderNo}</div>}
        {processType && <div style={{ fontSize: 13, color: "#475569", textAlign: "left" }}><span style={{ fontWeight: 600, color: "#64748b" }}>Type: </span>{processType}</div>}
        {location && <div style={{ fontSize: 13, color: "#475569", textAlign: "left" }}><span style={{ fontWeight: 600, color: "#64748b" }}>Location: </span>{location}</div>}
        {equipment && <div style={{ fontSize: 13, color: "#475569", textAlign: "left" }}><span style={{ fontWeight: 600, color: "#64748b" }}>Equipment: </span>{equipment}</div>}
        {date && <div style={{ fontSize: 13, color: "#475569", textAlign: "left" }}><span style={{ fontWeight: 600, color: "#64748b" }}>Date: </span>{date}</div>}
        {shift && <div style={{ fontSize: 13, color: "#475569", textAlign: "left" }}><span style={{ fontWeight: 600, color: "#64748b" }}>Shift: </span>{shift}</div>}
      </div>
    </div>
  );
}

export default function ConflictPopup({ conflict, role, name, department, onClose, onResolve }) {
  const [toast, setToast]               = useState(null);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [finalNote, setFinalNote]       = useState("");
  const [localStatus, setLocalStatus]   = useState(conflict.status);
  const [recordAData, setRecordAData]   = useState(null);
  const [recordBData, setRecordBData]   = useState(null);

  const isReadOnly       = role === "data_entry";
  const isSupervisorPlus = role === "supervisor" || role === "manager" || role === "director";
  const isManager        = role === "manager" || role === "director";
  const isResolved       = localStatus === "resolved" || localStatus === "overridden";

  const conflictReason = conflict.conflictReason || conflict.issue_summary || "Conflict detected";
  const aiSummaryText  = typeof conflict.aiSummary === "string" ? conflict.aiSummary : conflict.aiSummary?.conflictReason || conflict.issue_summary || "";
  const recommendation = conflict.recommendation || (typeof conflict.aiSummary === "object" ? conflict.aiSummary?.recommendation : null) || conflict.ai_recommendation || "";
  const confidence     = conflict.confidence || 0;
  const departments    = conflict.departmentsInvolved || [];
  const escalationNeeded = conflict.aiSummary?.escalationNeeded || false;
  const shortTitle     = makeShortTitle(conflictReason, departments);
  const summaryPoints  = parsePoints(aiSummaryText);
  const topRecommendation = parsePoints(recommendation)[0] || recommendation;

  const categories = detectConflictCategories(aiSummaryText, conflictReason);

  useEffect(() => {
    async function fetchAllRecords() {
      try {
        const res = await fetch("http://localhost:3001/api/records");
        const data = await res.json();
        const records = Array.isArray(data) ? data : data.data || [];
        console.log("All records:", records);
        console.log("Looking for recordA:", conflict.recordA, "recordB:", conflict.recordB);
        const normalize = (s) => (s || "").toLowerCase().replace(/[—–-]/g, "-").trim();
        const findRecord = (id) => {
          const found = records.find((r) =>
            r.id === id ||
            r.recordId === id ||
            r.id?.toLowerCase() === id?.toLowerCase() ||
            String(r.id) === String(id) ||
            normalize(r.title) === normalize(id)
          );
          console.log(`findRecord(${id}):`, found);
          return found || { id };
        };
        if (conflict.recordA && conflict.recordA !== "—") setRecordAData(findRecord(conflict.recordA));
        if (conflict.recordB && conflict.recordB !== "—") setRecordBData(findRecord(conflict.recordB));
      } catch (err) {
        console.error("Failed to fetch records:", err);
        setRecordAData({ id: conflict.recordA });
        setRecordBData({ id: conflict.recordB });
      }
    }
    fetchAllRecords();
  }, [conflict.recordA, conflict.recordB]);

  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function notify() {
    setToast("All parties notified");
    try { await fetch(`http://localhost:3001/api/conflicts/${conflict.conflictId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "notified" }) }); } catch (e) { console.error(e); }
    onResolve && onResolve(conflict.conflictId, { status: "notified" });
  }

  async function schedule() {
    setToast("Meeting scheduled");
    try { await fetch(`http://localhost:3001/api/conflicts/${conflict.conflictId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "scheduled" }) }); } catch (e) { console.error(e); }
    onResolve && onResolve(conflict.conflictId, { status: "scheduled" });
  }

  async function accept() {
    setLocalStatus("resolved");
    setToast("Recommendation accepted — conflict resolved");
    try { await fetch("http://localhost:3001/api/decisions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conflictId: conflict.conflictId, managerAction: "accepted", finalNote: "Accepted AI recommendation.", managerName: name, department, timestamp: new Date().toISOString() }) }); } catch (e) { console.error(e); }
    onResolve && onResolve(conflict.conflictId, { managerAction: "accepted", finalNote: "Accepted AI recommendation." });
    setTimeout(onClose, 1800);
  }

  async function confirmOverride() {
    if (!overrideReason) return;
    setLocalStatus("overridden");
    setShowOverride(false);
    setToast("Override logged — conflict resolved");
    try { await fetch("http://localhost:3001/api/decisions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conflictId: conflict.conflictId, managerAction: "overridden", finalNote: finalNote || overrideReason, overrideReason, managerName: name, department, timestamp: new Date().toISOString() }) }); } catch (e) { console.error(e); }
    onResolve && onResolve(conflict.conflictId, { managerAction: "overridden", finalNote: finalNote || overrideReason });
    setTimeout(onClose, 1800);
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popup" style={{ position: "relative", maxWidth: 600, width: "92%" }}>

        <div className="popup-header">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className={`badge badge-${(conflict.severity || "medium").toLowerCase()}`}>{conflict.severity || "Medium"}</span>
              {escalationNeeded && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: "#fef3c7", color: "#d97706", fontWeight: 700, border: "1px solid #fde68a" }}>Escalation needed</span>}
              {isResolved && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 100, background: "#f0fdf4", color: "#16a34a", fontWeight: 700, border: "1px solid #86efac" }}>{localStatus === "overridden" ? "Overridden" : "Resolved"}</span>}
            </div>
            <h3 className="popup-title">{shortTitle}</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
            <button className="close-btn" onClick={onClose}>×</button>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>{conflict.conflictId}</span>
          </div>
        </div>

        <div style={{ padding: "0 20px 20px" }}>

          <div style={{ textAlign: "right", marginBottom: 14, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{conflict.reportedAt}</span>
          </div>

          <p className="section-label">Conflicting Records</p>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            {/* <RecordCard recordId={conflict.recordA} record={recordAData} department={departments[0]} label="Record A" />
            <RecordCard recordId={conflict.recordB} record={recordBData} department={departments[1]} label="Record B" /> */}
            <RecordCard recordId={conflict.recordA} record={recordAData} department={departments[0]} />
<RecordCard recordId={conflict.recordB} record={recordBData} department={departments[1]} />
          </div>

          <p className="section-label">AI Analysis</p>
          <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "14px 16px", border: "1px solid #86efac", marginBottom: 16 }}>

            {/* AI Summary header */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2.5 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.07em" }}>AI Summary</span>
            </div>

            {/* Conflict type badges — own row so they never split */}
            {categories.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                {categories.map((key) => {
                  const cat = conflictCategories[key];
                  return (
                    <span key={key} style={{
                      fontSize: 11, fontWeight: 600,
                      padding: "3px 10px", borderRadius: 100,
                      background: cat.bg, color: cat.text,
                      border: `1px solid ${cat.border}`,
                      whiteSpace: "nowrap",
                    }}>
                      {cat.label}
                    </span>
                  );
                })}
              </div>
            )}

            {summaryPoints.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {summaryPoints.map((point, i) => {
                  const labels = ["What happened", "Why it conflicts", "Risk", "Impact", "Note"];
                  return (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", minWidth: 120, flexShrink: 0, textAlign: "left" }}>{labels[i] || "Detail"}:</span>
                      <span style={{ fontSize: 13, color: "#166534", lineHeight: 1.6, textAlign: "left", flex: 1 }}>{point}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#166534", margin: 0, textAlign: "left", lineHeight: 1.6 }}>{aiSummaryText || "No summary available."}</p>
            )}
          </div>

          <p className="section-label">Recommendation</p>
          <div style={{ background: "#eff6ff", borderRadius: 12, padding: "14px 16px", border: "1px solid #bfdbfe", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", minWidth: 62, flexShrink: 0 }}>Action:</span>
              <span style={{ fontSize: 13, color: "#1e3a8a", lineHeight: 1.6, textAlign: "left" }}>
                {topRecommendation || "Coordinate with affected departments to resolve the scheduling conflict."}
              </span>
            </div>
            <ConfidenceMeter value={confidence} />
          </div>

          {isReadOnly && (
            <div style={{ padding: 12, background: "#f1f5f9", borderRadius: 10, fontSize: 13, color: "#64748b", marginBottom: 12 }}>
              View only — actions require Supervisor or Manager access.
            </div>
          )}

          {isSupervisorPlus && !isResolved && !showOverride && (
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <button onClick={notify} style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#334155" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>Notify All</button>
              <button onClick={schedule} style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#334155" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>Schedule Meeting</button>
              {isManager && (
                <>
                  <button onClick={accept} style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "none", background: "#16a34a", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#fff" }} onMouseEnter={(e) => e.currentTarget.style.background = "#15803d"} onMouseLeave={(e) => e.currentTarget.style.background = "#16a34a"}>Accept Recommendation</button>
                  <button onClick={() => setShowOverride(true)} style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "1.5px solid #dc2626", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#dc2626" }} onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"} onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>Override</button>
                </>
              )}
            </div>
          )}

          {showOverride && (
            <div style={{ marginTop: 18, background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 12, padding: "16px 18px" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", marginBottom: 12 }}>Override reason</p>
              <select value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 10, fontSize: 13 }}>
                <option value="">Select a reason...</option>
                <option>Operational constraints not captured by AI</option>
                <option>New information received</option>
                <option>Safety override</option>
                <option>Management directive</option>
                <option>Emergency situation</option>
                <option>Other</option>
              </select>
              <textarea value={finalNote} onChange={(e) => setFinalNote(e.target.value)} placeholder="Final note (logged with this decision)..." style={{ width: "100%", minHeight: 76, padding: "10px", borderRadius: 8, border: "1px solid #e2e8f0", resize: "vertical", marginBottom: 12, fontSize: 13 }} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setShowOverride(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13 }}>Cancel</button>
                <button onClick={confirmOverride} disabled={!overrideReason} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13, opacity: overrideReason ? 1 : 0.4 }}>Confirm override</button>
              </div>
            </div>
          )}

          {isResolved && conflict.decision && (
            <div style={{ marginTop: 18, background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Decision record</p>
              <div style={{ fontSize: 13, color: "#166534", textAlign: "left" }}><span style={{ fontWeight: 600 }}>Action: </span>{conflict.decision.managerAction === "accepted" ? "Accepted AI recommendation" : "Overridden by manager"}</div>
              {conflict.decision.finalNote && <div style={{ fontSize: 13, color: "#166534", marginTop: 5, textAlign: "left" }}><span style={{ fontWeight: 600 }}>Note: </span>{conflict.decision.finalNote}</div>}
            </div>
          )}
        </div>

        {toast && <Toast message={toast} onDone={() => setToast(null)} />}

        <style>{`
          @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
          .popup { background: white; border-radius: 18px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.2); }
          .popup-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 20px 14px 20px; border-bottom: 1px solid #e2e8f0; }
          .popup-title { font-size: 16px; font-weight: 700; color: #0f1923; letter-spacing: -0.01em; margin: 0; text-align: left; }
          .close-btn { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 18px; cursor: pointer; color: #64748b; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
          .close-btn:hover { background: #f1f5f9; color: #0f1923; }
          .section-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 8px; }
          .badge { padding: 3px 9px; border-radius: 100px; font-size: 11px; font-weight: 700; }
          .badge-high { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
          .badge-medium { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
          .badge-low { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        `}</style>
      </div>
    </div>

    
  );
}
