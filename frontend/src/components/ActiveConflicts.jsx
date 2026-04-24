import { useState, useMemo, useEffect } from "react";
import ConflictPopup from "./ConflictPopup";
import { makeShortTitle } from "../utils/conflictUtils";

const severityOrder = { High: 0, Medium: 1, Low: 2 };

const statusMeta = {
  urgent:    { label: "Awaiting coordination", dot: "#ef4444", pulse: true },
  notified:  { label: "All parties notified",  dot: "#f59e0b", pulse: false },
  scheduled: { label: "Meeting scheduled",     dot: "#f59e0b", pulse: false },
  progress:  { label: "Meeting scheduled",     dot: "#f59e0b", pulse: false },
  pending:   { label: "Pending review",        dot: "#94a3b8", pulse: false },
  resolved:  { label: "Resolved",              dot: "#22c55e", pulse: false },
};

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.active;
  return (
    <span style={{
      fontSize: "11px",
      padding: "3px 10px",
      borderRadius: "20px",
      background: config.bg,
      color: config.color,
      fontWeight: 600,
      border: `1px solid ${config.color}40`
    }}>
      {config.label}
    </span>
  );
}

function SeverityBadge({ severity }) {
  return (
    <span className={`badge badge-${severity.toLowerCase()}`}>
      {severity}
    </span>
  );
}

function resolveRecordId(value, records) {
  if (!value || value === "—") return value;
  if (/^record\d+$/i.test(value)) return value;
  const normalize = (s) => (s || "").toLowerCase().replace(/[—–-]/g, "-").trim();
  const found = records.find((r) =>
    normalize(r.title) === normalize(value)
  );
  return found?.id || value;
}

export default function ActiveConflicts({ role, department, name }) {
  const [conflicts, setConflicts]       = useState([]);
  const [records, setRecords]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selected, setSelected]         = useState(null);
  const [filter, setFilter]             = useState("All");
  const [search, setSearch]             = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const isReadOnly = role === "data_entry";
  const isSupervisor = role === "supervisor" || role === "manager";
  const isManager = role === "manager";
  const filters = ["All", "High", "Medium", "Low"];

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [showResolved]);

  async function fetchAll() {
    await Promise.all([fetchConflicts(), fetchRecords()]);
  }

  async function fetchRecords() {
    try {
      const res = await fetch("http://localhost:3001/api/records");
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("Failed to fetch records:", err);
    }
  }, []);

  const fetchConflicts = useCallback(async () => {
    try {
      const url = showResolved 
        ? "http://localhost:3001/api/conflicts/all"
        : "http://localhost:3001/api/conflicts";
      const response = await fetch(url);
      const data = await response.json();
      const raw = Array.isArray(data) ? data : data.data || [];
      
      console.log("Raw conflicts from API:", raw);
      
      const mapped = raw.map((c) => ({
        conflictId: c.conflictId || c.id,
        conflictReason: c.conflictReason || c.issue_summary || c.title || "Conflict detected",
        severity: c.severity ? c.severity.charAt(0).toUpperCase() + c.severity.slice(1) : "Medium",
        departmentsInvolved: c.departmentsInvolved || [c.department_a, c.department_b].filter(Boolean) || [c.department].filter(Boolean),
        status: c.status === "active" ? "open" : c.status,
        statusType: c.status === "active" ? "urgent" 
          : c.status === "notified" ? "notified"
          : c.status === "scheduled" ? "scheduled"
          : c.status === "overridden" || c.status === "resolved" ? "resolved" 
          : "pending",
        confidence: c.confidence ? (c.confidence <= 1 ? Math.round(c.confidence * 100) : c.confidence) : 0,
        reportedAt: c.first_detected ? new Date(c.first_detected).toLocaleString() : "—",
        recordA: c.records_involved?.[0] || c.recordA || "—",
        recordB: c.records_involved?.[1] || c.recordB || "—",
        recommendation: c.recommendation || c.ai_recommendation || "",
        meetingDate: c.meetingDate || null,
        meetingTime: c.meetingTime || null,
        notifiedAt: c.notifiedAt || null,
      }));
      
      console.log("Mapped conflicts:", mapped);
      setConflicts(mapped);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch conflicts:", err);
      setError("Could not connect to server");
      setLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchConflicts(), fetchRecords()]);
  }, [fetchConflicts, fetchRecords]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
    const intervalId = setInterval(fetchAll, 5000);
    return () => clearInterval(intervalId);
  }, [fetchAll]);

  // Action Handlers
  async function handleNotify(conflict) {
    try {
      await fetch(`http://localhost:3001/api/conflicts/${conflict.conflictId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "notified", notifiedAt: new Date().toISOString() })
      });
      setActionMessage("✅ All parties notified");
      fetchConflicts();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (error) {
      console.error("Failed to notify:", error);
      setActionMessage("❌ Failed to notify");
      setTimeout(() => setActionMessage(null), 3000);
    }
  }

  const [showSchedulePopup, setShowSchedulePopup] = useState(false);
  const [selectedMeetingConflict, setSelectedMeetingConflict] = useState(null);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");

  async function handleSchedule(conflict, date, time) {
    if (!date || !time) {
      alert("Please select both date and time");
      return;
    }
    try {
      await fetch(`http://localhost:3001/api/conflicts/${conflict.conflictId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "scheduled", 
          meetingDate: date, 
          meetingTime: time 
        })
      });
      setActionMessage(`📅 Meeting scheduled for ${date} at ${time}`);
      fetchConflicts();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (error) {
      console.error("Failed to schedule:", error);
      setActionMessage("❌ Failed to schedule");
      setTimeout(() => setActionMessage(null), 3000);
    }
  }

  async function handleAccept(conflict) {
    try {
      await fetch(`http://localhost:3001/api/conflicts/${conflict.conflictId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" })
      });
      
      await fetch("http://localhost:3001/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conflictId: conflict.conflictId,
          managerAction: "accepted",
          finalNote: "Accepted AI recommendation.",
          timestamp: new Date().toISOString()
        })
      });
      
      setActionMessage("✅ Recommendation accepted - conflict resolved");
      fetchConflicts();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (error) {
      console.error("Failed to accept:", error);
      setActionMessage("❌ Failed to accept");
      setTimeout(() => setActionMessage(null), 3000);
    }
  }

  async function handleOverride(conflict) {
    const reason = prompt("Enter override reason:");
    if (!reason) return;
    
    try {
      await fetch(`http://localhost:3001/api/conflicts/${conflict.conflictId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "overridden" })
      });
      
      await fetch("http://localhost:3001/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conflictId: conflict.conflictId,
          managerAction: "overridden",
          finalNote: reason,
          overrideReason: reason,
          timestamp: new Date().toISOString()
        })
      });
      
      setActionMessage("⚠️ Override logged - conflict resolved");
      fetchConflicts();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (error) {
      console.error("Failed to override:", error);
      setActionMessage("❌ Failed to override");
      setTimeout(() => setActionMessage(null), 3000);
    }
  }

  function openSchedulePopup(conflict) {
    setSelectedMeetingConflict(conflict);
    setMeetingDate("");
    setMeetingTime("");
    setShowSchedulePopup(true);
  }

  function confirmSchedule() {
    if (selectedMeetingConflict) {
      handleSchedule(selectedMeetingConflict, meetingDate, meetingTime);
      setShowSchedulePopup(false);
    }
  }

  // Filter conflicts based on department
  const departmentConflicts = useMemo(() => {
    return conflicts.filter((c) => {
      const depts = c.departmentsInvolved || [];
      // Show if department is involved OR if no specific department filter
      return depts.includes(department);
    });
  }, [conflicts, department]);

  console.log("Department conflicts:", departmentConflicts);
  console.log("Current department:", department);

  // Open conflicts (not resolved)
  const openConflicts = useMemo(() => {
    return departmentConflicts.filter((c) => 
      c.status !== "accepted" && c.status !== "resolved" && c.status !== "overridden"
    );
  }, [departmentConflicts]);

  // Resolved conflicts
  const resolvedConflictsList = useMemo(() => {
    return departmentConflicts.filter((c) => 
      c.status === "accepted" || c.status === "resolved" || c.status === "overridden"
    );
  }, [departmentConflicts]);

  console.log("Open conflicts:", openConflicts);
  console.log("Resolved conflicts:", resolvedConflictsList);

  const displayedConflicts = showResolved ? resolvedConflictsList : openConflicts;

  const filteredConflicts = useMemo(() => {
    return displayedConflicts
      .filter((c) => filter === "All" || c.severity === filter)
      .filter((c) =>
        search === "" ||
        (c.conflictReason && c.conflictReason.toLowerCase().includes(search.toLowerCase())) ||
        (c.departmentsInvolved && c.departmentsInvolved.some((d) => d.toLowerCase().includes(search.toLowerCase()))) ||
        (c.conflictId && c.conflictId.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));
  }, [displayedConflicts, filter, search]);

  const counts = useMemo(() => ({
    All: filteredConflicts.length,
    High: filteredConflicts.filter((c) => c.severity === "High").length,
    Medium: filteredConflicts.filter((c) => c.severity === "Medium").length,
    Low: filteredConflicts.filter((c) => c.severity === "Low").length,
  }), [filteredConflicts]);

  function handleResolve(conflictId, decision) {
    setConflicts((prev) =>
      prev.map((c) => {
        if (c.conflictId !== conflictId) return c;
        const status = decision.status || "resolved";
        const statusType = status === "notified" ? "notified"
          : status === "scheduled" ? "scheduled"
          : "resolved";
        return { ...c, status, statusType, decision };
      })
    );
  }

  return (
    <div className="tab-content">
      {/* Action Message Toast */}
      {actionMessage && (
        <div style={{
          position: "fixed",
          top: 80,
          right: 20,
          background: "#0f1923",
          color: "white",
          padding: "12px 24px",
          borderRadius: "8px",
          zIndex: 1000,
          animation: "fadeIn 0.3s ease"
        }}>
          {actionMessage}
        </div>
      )}

      {/* Header */}
      <div className="section-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 className="section-title">Active Conflicts</h2>
          {openCount > 0 && <span className="conflict-count">{openCount} open</span>}
          {resolvedCount > 0 && !showResolved && (
            <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
              {resolvedCount} resolved
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            onClick={() => setShowResolved(!showResolved)} 
            style={{ 
              fontSize: 13, fontWeight: 600, 
              color: showResolved ? "#2563eb" : "#64748b", 
              background: showResolved ? "#eff6ff" : "none", 
              border: "1.5px solid #e2e8f0", 
              borderRadius: 8, 
              padding: "6px 14px", 
              cursor: "pointer" 
            }}
          >
            {showResolved ? "Hide Resolved" : `Show Resolved (${resolvedCount})`}
          </button>
          <button onClick={fetchAll} style={{ 
            fontSize: 13, fontWeight: 600, color: "#64748b", 
            background: "none", border: "1.5px solid #e2e8f0", 
            borderRadius: 8, padding: "6px 14px", cursor: "pointer" 
          }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Department Filter Info */}
      {department && (
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
          Showing conflicts involving{" "}
          <span style={{ 
            display: "inline-flex", alignItems: "center", 
            background: "#eff6ff", color: "#1d4ed8", 
            border: "0.5px solid #bfdbfe", borderRadius: 20, 
            padding: "2px 10px", fontSize: 12, fontWeight: 600 
          }}>
            {department}
          </span>
        </div>
      )}

      {/* Read-only Banner */}
      {isReadOnly && (
        <div className="readonly-banner" style={{ 
          background: '#eff6ff', border: '1px solid #dbeafe', 
          color: '#1e40af', padding: '12px 16px', borderRadius: '8px', 
          marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' 
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="#2563eb" strokeWidth="1.3"/>
            <path d="M8 7v4M8 5.5v.3" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          View only — conflict coordination requires Supervisor or Manager access.
        </div>
      )}

      {/* Search & Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ 
          display: "flex", alignItems: "center", gap: 9, background: "#fff", 
          border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "0 14px", 
          flex: 1, minWidth: 180, height: 40 
        }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="#94a3b8" strokeWidth="1.4"/>
            <path d="M10.5 10.5l3 3" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input 
            type="text" 
            placeholder="Search by ID, reason or department..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, width: "100%" }}
          />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>×</button>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {filters.map((f) => (
            <button 
              key={f} 
              onClick={() => setFilter(f)} 
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1.5px solid #e2e8f0",
                background: filter === f ? "#1e293b" : "white",
                color: filter === f ? "white" : "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              {f}<span style={{ background: filter === f ? "#475569" : "#e2e8f0", padding: "2px 6px", borderRadius: 20, fontSize: 11 }}>{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading / Error / Empty States */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
          <div style={{ width: 24, height: 24, border: "2.5px solid #e2e8f0", borderTop: "2.5px solid #2563eb", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
          Loading conflicts...
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#ef4444" }}>
          {error} — <button onClick={fetchAll} style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}>retry</button>
        </div>
      ) : filteredConflicts.length === 0 ? (
        <div className="empty-state" style={{ textAlign: "center", padding: "3rem", background: "#f8fafc", borderRadius: 16 }}>
          <p style={{ fontSize: 16, color: "#64748b" }}>
            {showResolved ? "No resolved conflicts yet." : "No open conflicts match your filter."}
          </p>
        </div>
      ) : (
        <div className="conflict-list">
          {filteredConflicts.map((conflict, i) => {
            const displayA = resolveRecordId(conflict.recordA, records);
            const displayB = resolveRecordId(conflict.recordB, records);
            const isResolved = conflict.status === "accepted" || conflict.status === "resolved" || conflict.status === "overridden";
            
            return (
              <div
                key={conflict.conflictId || i}
                onClick={() => setSelectedConflict(conflict)}
                style={{
                  background: "white",
                  borderRadius: "14px",
                  padding: "20px",
                  border: "1px solid #e2e8f0",
                  borderLeft: `4px solid ${conflict.severity === "High" ? "#ef4444" : conflict.severity === "Medium" ? "#f59e0b" : "#3b82f6"}`,
                  marginBottom: "16px",
                  opacity: isResolved ? 0.7 : 1,
                  transition: "all 0.2s ease",
                  cursor: "pointer"
                }}
              >
                {/* Header with Severity and Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <SeverityBadge severity={conflict.severity || "Low"} />
                    <StatusBadge status={conflict.status || "active"} />
                  </div>
                  <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>{conflict.conflictId}</span>
                </div>

                <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  {(conflict.departmentsInvolved || []).map((d) => (
                    <span key={d} className="dept-tag" style={d === department ? { background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe", fontWeight: 700 } : {}}>
                      {d}
                    </span>
                  ))}
                </div>

                {/* AI Recommendation - Only show for open conflicts */}
                {!isResolved && (
                  <div style={{ background: "#f0fdf4", padding: "12px", borderRadius: "10px", marginBottom: "12px" }}>
                    <strong style={{ color: "#16a34a", fontSize: "12px" }}>💡 Recommendation:</strong>
                    <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#166534" }}>
                      {conflict.recommendation || "Coordinate with affected departments."}
                    </p>
                  </div>
                )}

                {/* AI Confidence */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>AI confidence</span>
                    <span style={{ fontSize: "11px", fontWeight: "bold", color: "#16a34a" }}>{conflict.confidence}%</span>
                  </div>
                  <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "2px" }}>
                    <div style={{ width: `${conflict.confidence}%`, height: "100%", background: "#22c55e", borderRadius: "2px" }} />
                  </div>
                </div>

                {/* Action Buttons - Only for non-resolved conflicts and Supervisor+ */}
                {!isResolved && isSupervisor && (
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleNotify(conflict); }}
                      style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "12px",color: "#1e293b" }}
                    >
                      Notify All
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); openSchedulePopup(conflict); }}
                      style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "12px" ,color: "#1e293b"}}
                    >
                      Schedule Meeting
                    </button>
                    {isManager && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAccept(conflict); }}
                          style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "none", background: "#16a34a", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "12px" }}
                        >
                          Accept
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOverride(conflict); }}
                          style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #dc2626", background: "#fff", color: "#dc2626", cursor: "pointer", fontWeight: 600, fontSize: "12px" }}
                        >
                          Override
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Meeting Popup */}
      {showSchedulePopup && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSchedulePopup(false); }} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", width: "320px" }}>
            <h3 style={{ margin: "0 0 16px 0" }}>Schedule Meeting</h3>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: 600 }}>Date</label>
              <input 
                type="date" 
                value={meetingDate} 
                onChange={(e) => setMeetingDate(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: 600 }}>Time</label>
              <input 
                type="time" 
                value={meetingTime} 
                onChange={(e) => setMeetingTime(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
              />
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowSchedulePopup(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer",color: "#1e293b" }}>Cancel</button>
              <button onClick={confirmSchedule} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Details Popup */}
      {selectedConflict && (
        <ConflictPopup
          conflict={selectedConflict}
          role={role}
          name={name}
          department={department}
          onClose={() => setSelected(null)}
          onResolve={handleResolve}
        />
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .badge {
          padding: 3px 9px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
        }
        .badge-high { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .badge-medium { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
        .badge-low { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .dept-tag {
          background: #f1f5f9;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
          color: #475569;
          border: 1px solid #e2e8f0;
        }
      `}</style>
    </div>
  );
}