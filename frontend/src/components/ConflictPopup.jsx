import { useEffect, useState } from "react";

const deptColors = {
  Production: { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
  Maintenance: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  Logistics: { bg: "#fffbeb", text: "#d97706", border: "#fed7aa" },
  "RESOURCE ALLOCATION": { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
  "EMERGENCY": { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  "Quality Control": { bg: "#faf5ff", text: "#7c3aed", border: "#ddd6fe" },
};

function ConfidenceMeter({ value }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(value), 150); return () => clearTimeout(t); }, [value]);
  const color = value >= 80 ? "#22c55e" : value >= 60 ? "#f59e0b" : "#ef4444";
  const bg = value >= 80 ? "#f0fdf4" : value >= 60 ? "#fffbeb" : "#fef2f2";
  const text = value >= 80 ? "#16a34a" : value >= 60 ? "#d97706" : "#dc2626";
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>AI confidence</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: text, background: bg, padding: "2px 10px", borderRadius: 100, border: `1px solid ${color}` }}>
          {value}%
        </span>
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
    <div style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", background: "#0f1923", color: "#f8fafc", padding: "10px 22px", borderRadius: 100, fontSize: 14, fontWeight: 600, zIndex: 20, animation: "fadeUp 0.2s ease", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>{message}</div>
  );
}

export default function ConflictPopup({ conflict, role, onClose, onAccept, onOverride }) {
  const [toast, setToast] = useState(null);
  const [showOverride, setShowOverride] = useState(false);
  const [finalNote, setFinalNote] = useState("");
  const [localStatus, setLocalStatus] = useState(conflict.status);

  const [showNotifyInput, setShowNotifyInput] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [showMeetingInput, setShowMeetingInput] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState({ date: "", time: "" });

  const isSupervisorPlus = role === "supervisor" || role === "manager";
  const isManager = role === "manager";
  const isResolved = localStatus === "resolved" || localStatus === "overridden";

  const recommendation = conflict.involvedRecords?.[1]
    ? `Based on "${conflict.involvedRecords[1].description}", consider moving this task to a different shift.`
    : "Adjust scheduling to resolve resource bottleneck.";

  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  function notify() {
    if (!announcement.trim()) return;
    if (onAccept) onAccept(conflict.id, { announcement });
    setToast("Announcement sent to Firebase");
    setShowNotifyInput(false);
  }

  function schedule() {
    if (!meetingDetails.date || !meetingDetails.time) return;
    if (onAccept) onAccept(conflict.id, { meetingDate: meetingDetails.date, meetingTime: meetingDetails.time });
    setToast("Meeting saved to Firebase");
    setShowMeetingInput(false);
  }

  function accept() {
    setLocalStatus("resolved");
    setToast("Recommendation accepted");
    if (onAccept) onAccept(conflict.id, { status: "resolved", resolutionType: "AI_ACCEPTED" });
    if (onDecisionComplete) onDecisionComplete();
    setTimeout(onClose, 1800);
  }

  function confirmOverride() {
    if (!finalNote.trim()) { setToast("Please enter an override reason."); return; }
    setLocalStatus("overridden");
    setShowOverride(false);
    setToast("Override logged — conflict resolved");
    if (onAccept) onAccept(conflict.id, { status: "overridden", finalSolution: finalNote, resolvedBy: "Manager" });
    if (onDecisionComplete) onDecisionComplete();
    setTimeout(onClose, 1800);
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popup" style={{ position: "relative" }}>
        
        {/* Real-time Status Banners */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 15 }}>
          {(conflict.announcement) && (
            <div style={{ background: "#fff7ed", border: "1px solid #ffedd5", padding: "10px 14px", borderRadius: "10px", display: "flex", gap: 10, alignItems: "center" }}>
              <span>📢</span>
              <div style={{ fontSize: 13, color: "#9a3412" }}><strong>Announcement:</strong> {conflict.announcement}</div>
            </div>
          )}
          {(conflict.meetingDate) && (
            <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", padding: "10px 14px", borderRadius: "10px", display: "flex", gap: 10, alignItems: "center" }}>
              <span>📅</span>
              <div style={{ fontSize: 13, color: "#166534" }}><strong>Meeting:</strong> {conflict.meetingDate} at {conflict.meetingTime}</div>
            </div>
          )}
        </div>

        <div className="popup-header">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>ID: {conflict.id?.slice(0, 5)}</span>
              <span className={`badge badge-${(conflict.priority || "medium").toLowerCase()}`}>{conflict.priority || "Medium"}</span>
              {isResolved && <span className="resolved-pill">Resolved</span>}
            </div>
            <h3 className="popup-title">Resource Overlap at {conflict.location}</h3>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 25, marginTop: 20 }}>
          {conflict.involvedRecords?.map((rec, index) => {
            const theme = deptColors[rec.category] || { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" };
            return (
              <div key={index} style={{ background: "white", border: `1px solid ${theme.border}`, borderRadius: "16px", overflow: "hidden", display: "flex", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                <div style={{ width: "8px", background: theme.text }}></div>
                <div style={{ flex: 1, padding: "20px" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: theme.text, background: theme.bg, padding: "4px 10px", borderRadius: "6px" }}>{rec.category}</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 8 }}>{rec.title}</div>
                  <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>{rec.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rec-block" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 500 }}>{recommendation}</p>
          <ConfidenceMeter value={conflict.confidence || 85} />
        </div>

        {isSupervisorPlus && !isResolved && !showOverride && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="popup-actions">
              <button className="btn btn-secondary" onClick={() => setShowNotifyInput(!showNotifyInput)}>Notify All</button>
              <button className="btn btn-secondary" onClick={() => setShowMeetingInput(!showMeetingInput)}>Schedule Meeting</button>
              {isManager && (
                <>
                  <button className="btn btn-accept" onClick={accept}>Accept AI</button>
                  <button className="btn btn-override" onClick={() => setShowOverride(true)}>Manual Override</button>
                </>
              )}
            </div>

            {showNotifyInput && (
              <div style={{ background: "#fdf2f8", padding: 16, borderRadius: 12, border: "1.5px solid #fbcfe8" }}>
                <textarea value={announcement} onChange={(e) => setAnnouncement(e.target.value)} placeholder="Type broadcast message..." style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid #fbcfe8" }} />
                <button className="btn btn-accept" style={{ background: "#be185d", width: '100%' }} onClick={notify}>Send Announcement</button>
              </div>
            )}

            {showMeetingInput && (
              <div style={{ background: "#eff6ff", padding: 16, borderRadius: 12, border: "1.5px solid #bfdbfe" }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <input type="date" onChange={(e) => setMeetingDetails({...meetingDetails, date: e.target.value})} style={{ flex: 1, padding: 8, border: "1px solid #bfdbfe" }} />
                  <input type="time" onChange={(e) => setMeetingDetails({...meetingDetails, time: e.target.value})} style={{ flex: 1, padding: 8, border: "1px solid #bfdbfe" }} />
                </div>
                <button className="btn btn-accept" style={{ background: "#1d4ed8", width: '100%' }} onClick={schedule}>Confirm Meeting</button>
              </div>
            )}
          </div>
        )}

        {showOverride && (
          <div style={{ marginTop: 18, background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 12, padding: "16px 18px" }}>
             <p style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>Manual Manager Override</p>
             <textarea value={finalNote} onChange={(e) => setFinalNote(e.target.value)} placeholder="Enter manual justification..." style={{ width: "100%", minHeight: 80, padding: 10, marginTop: 10, borderRadius: 8, border: "1px solid #fecaca" }} />
             <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setShowOverride(false)}>Cancel</button>
                <button className="btn btn-override" onClick={confirmOverride} disabled={!finalNote.trim()}>Confirm Override</button>
             </div>
          </div>
        )}

        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </div>
    </div>
  );
}
