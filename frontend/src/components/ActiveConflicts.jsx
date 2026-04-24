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

function SeverityBadge({ severity }) {
  return <span className={`badge badge-${severity.toLowerCase()}`}>{severity}</span>;
}

function StatusDot({ type }) {
  const m = statusMeta[type] || statusMeta.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.dot, display: "inline-block", ...(m.pulse ? { animation: "pulse 1.5s infinite" } : {}) }} />
      <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{m.label}</span>
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

  const isReadOnly = role === "data_entry";
  const filters    = ["All", "High", "Medium", "Low"];

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
  }

  async function fetchConflicts() {
    try {
      const url = showResolved 
        ? "http://localhost:3001/api/conflicts/all"
        : "http://localhost:3001/api/conflicts";
      const response = await fetch(url);
      const data = await response.json();
      const raw = Array.isArray(data) ? data : data.data || [];
      const mapped = raw.map((c) => ({
        conflictId: c.id || c.conflictId,
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
        aiSummary: {
          recommendation: c.ai_recommendation || c.recommendation || c.aiSummary?.recommendation || "—",
          conflictReason: c.issue_summary || c.conflictReason || c.aiSummary || "—",
        },
        recommendation: c.recommendation || c.ai_recommendation || "",
        decision: c.finalSolution ? { managerAction: c.resolutionType, finalNote: c.finalSolution } : null,
      }));
      setConflicts(mapped);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch conflicts:", err);
      setError("Could not connect to server");
      setLoading(false);
    }
  }

  const openCount = useMemo(
    () => conflicts.filter((c) => c.status !== "resolved" && c.status !== "overridden" && (c.departmentsInvolved || []).includes(department)).length,
    [conflicts, department]
  );

  const filtered = useMemo(() => {
    return conflicts
      .filter((c) => showResolved ? true : c.status !== "resolved" && c.status !== "overridden")
      .filter((c) => (c.departmentsInvolved || []).includes(department))
      .filter((c) => filter === "All" || c.severity === filter)
      .filter((c) =>
        search === "" ||
        (c.conflictReason && c.conflictReason.toLowerCase().includes(search.toLowerCase())) ||
        (c.departmentsInvolved && c.departmentsInvolved.some((d) => d.toLowerCase().includes(search.toLowerCase()))) ||
        (c.conflictId && c.conflictId.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));
  }, [conflicts, filter, search, showResolved, department]);

  const counts = useMemo(() => ({
    All:    filtered.length,
    High:   filtered.filter((c) => c.severity === "High").length,
    Medium: filtered.filter((c) => c.severity === "Medium").length,
    Low:    filtered.filter((c) => c.severity === "Low").length,
  }), [filtered]);

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
      <div className="section-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 className="section-title">Active Conflicts</h2>
          {openCount > 0 && <span className="conflict-count">{openCount} open</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowResolved(!showResolved)} style={{ fontSize: 13, fontWeight: 600, color: showResolved ? "#2563eb" : "#64748b", background: showResolved ? "#eff6ff" : "none", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
            {showResolved ? "Hide resolved" : "Show resolved"}
          </button>
          <button onClick={fetchAll} style={{ fontSize: 13, fontWeight: 600, color: "#64748b", background: "none", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
            Refresh
          </button>
        </div>
      </div>

      {department && (
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
          Showing conflicts involving{" "}
          <span style={{ display: "inline-flex", alignItems: "center", background: "#eff6ff", color: "#1d4ed8", border: "0.5px solid #bfdbfe", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
            {department}
          </span>
        </div>
      )}

      {isReadOnly && (
        <div className="readonly-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="8" cy="8" r="6.5" stroke="#2563eb" strokeWidth="1.3"/>
            <path d="M8 7v4M8 5.5v.3" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          View only — conflict coordination requires Supervisor or Manager access.
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "0 14px", flex: 1, minWidth: 180, height: 40 }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke="#94a3b8" strokeWidth="1.4"/>
            <path d="M10.5 10.5l3 3" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input type="text" placeholder="Search by ID, reason or department..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, width: "100%", padding: 0, color: "#0f1923" }}
          />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, lineHeight: 1 }}>×</button>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`filter-btn ${filter === f ? "filter-btn-active" : ""} ${f !== "All" ? `filter-btn-${f.toLowerCase()}` : ""}`}>
              {f}<span className="filter-count">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
          <div style={{ width: 24, height: 24, border: "2.5px solid #e2e8f0", borderTop: "2.5px solid #2563eb", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
          Loading conflicts...
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#ef4444", fontSize: 14 }}>
          {error} — <button onClick={fetchAll} style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">No conflicts match your filter.</div>
      ) : (
        <div className="conflict-list">
          {filtered.map((conflict, i) => {
            const displayA = resolveRecordId(conflict.recordA, records);
            const displayB = resolveRecordId(conflict.recordB, records);
            return (
              <div
                key={conflict.conflictId || i}
                className={`conflict-card severity-${(conflict.severity || "low").toLowerCase()}`}
                onClick={() => setSelected(conflict)}
                style={{ animationDelay: `${i * 55}ms`, opacity: conflict.status === "resolved" || conflict.status === "overridden" ? 0.55 : 1 }}
              >
                <div className="conflict-card-header">
                  <SeverityBadge severity={conflict.severity || "Low"} />
                  <span className="conflict-title">
                    {makeShortTitle(conflict.conflictReason, conflict.departmentsInvolved)}
                  </span>
                  {(conflict.status === "resolved" || conflict.status === "overridden") && (
                    <span style={{ marginLeft: "auto", fontSize: 12, padding: "3px 10px", borderRadius: 100, background: "#f0fdf4", color: "#16a34a", fontWeight: 700, border: "1px solid #86efac", flexShrink: 0 }}>
                      {conflict.status === "overridden" ? "Overridden" : "Resolved"}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  {(conflict.departmentsInvolved || []).map((d) => (
                    <span key={d} className="dept-tag" style={d === department ? { background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe", fontWeight: 700 } : {}}>{d}</span>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <StatusDot type={conflict.statusType || "pending"} />
                  <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{conflict.conflictId}</span>
                </div>

                <div style={{ marginTop: 12, height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${conflict.confidence || 0}%`, background: (conflict.confidence || 0) >= 80 ? "#22c55e" : (conflict.confidence || 0) >= 60 ? "#f59e0b" : "#ef4444", borderRadius: 2, transition: "width 0.5s ease" }} />
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, textAlign: "right", fontWeight: 500 }}>
                  AI confidence {conflict.confidence || 0}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <ConflictPopup
          conflict={conflicts.find((c) => c.conflictId === selected.conflictId)}
          role={role}
          name={name}
          department={department}
          onClose={() => setSelected(null)}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
}
