import { useState, useMemo } from "react";
import mockConflicts from "../data/mockConflicts";
import ConflictPopup from "./ConflictPopup";

const severityOrder = { High: 0, Medium: 1, Low: 2 };

const statusMeta = {
  urgent:   { label: "Awaiting coordination", dot: "#ef4444", pulse: true },
  progress: { label: "Meeting scheduled",     dot: "#f59e0b", pulse: false },
  pending:  { label: "Pending review",        dot: "#94a3b8", pulse: false },
  resolved: { label: "Resolved",              dot: "#22c55e", pulse: false },
};

function SeverityBadge({ severity }) {
  return <span className={`badge badge-${severity.toLowerCase()}`}>{severity}</span>;
}

function StatusDot({ type }) {
  const m = statusMeta[type] || statusMeta.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%", background: m.dot, display: "inline-block",
        ...(m.pulse ? { animation: "pulse 1.5s infinite" } : {}),
      }} />
      <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{m.label}</span>
    </span>
  );
}

export default function ActiveConflicts({ role }) {
  const [conflicts, setConflicts] = useState(mockConflicts);
  const [selected, setSelected]   = useState(null);
  const [filter, setFilter]       = useState("All");
  const [search, setSearch]       = useState("");

  const isReadOnly = role === "data_entry";
  const filters    = ["All", "High", "Medium", "Low"];

  const openCount = useMemo(
    () => conflicts.filter((c) => c.status !== "resolved").length,
    [conflicts]
  );

  const filtered = useMemo(() => {
    return conflicts
      .filter((c) => filter === "All" || c.severity === filter)
      .filter((c) =>
        search === "" ||
        c.conflictReason.toLowerCase().includes(search.toLowerCase()) ||
        c.departmentsInvolved.some((d) => d.toLowerCase().includes(search.toLowerCase())) ||
        c.conflictId.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [conflicts, filter, search]);

  const counts = useMemo(() => ({
    All:    conflicts.length,
    High:   conflicts.filter((c) => c.severity === "High").length,
    Medium: conflicts.filter((c) => c.severity === "Medium").length,
    Low:    conflicts.filter((c) => c.severity === "Low").length,
  }), [conflicts]);

  function handleResolve(conflictId, decision) {
    setConflicts((prev) =>
      prev.map((c) =>
        c.conflictId === conflictId
          ? { ...c, status: "resolved", statusType: "resolved", decision }
          : c
      )
    );
  }

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="section-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 className="section-title">Active Conflicts</h2>
          {openCount > 0 && <span className="conflict-count">{openCount} open</span>}
        </div>
      </div>

      {/* Read-only banner */}
      {isReadOnly && (
        <div className="readonly-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="8" cy="8" r="6.5" stroke="#2563eb" strokeWidth="1.3"/>
            <path d="M8 7v4M8 5.5v.3" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          View only — conflict coordination requires Supervisor or Manager access.
        </div>
      )}

      {/* Search + filter row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 9,
          background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10,
          padding: "0 14px", flex: 1, minWidth: 180, height: 40,
          transition: "border-color 0.15s",
        }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke="#94a3b8" strokeWidth="1.4"/>
            <path d="M10.5 10.5l3 3" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search by ID, reason or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: "none", outline: "none", background: "transparent",
              fontSize: 14, width: "100%", padding: 0, color: "#0f1923",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`filter-btn ${filter === f ? "filter-btn-active" : ""} ${f !== "All" ? `filter-btn-${f.toLowerCase()}` : ""}`}
            >
              {f}
              <span className="filter-count">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ margin: "0 auto 12px", display: "block" }}>
            <circle cx="20" cy="20" r="18" stroke="#e2e8f0" strokeWidth="1.5"/>
            <path d="M14 20h12M20 14v12" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          No conflicts match your filter.
        </div>
      ) : (
        <div className="conflict-list">
          {filtered.map((conflict, i) => (
            <div
              key={conflict.conflictId}
              className={`conflict-card severity-${conflict.severity.toLowerCase()}`}
              onClick={() => setSelected(conflict)}
              style={{ animationDelay: `${i * 55}ms`, opacity: conflict.status === "resolved" ? 0.55 : 1 }}
            >
              <div className="conflict-card-header">
                <SeverityBadge severity={conflict.severity} />
                <span className="conflict-title">{conflict.conflictReason}</span>
                {conflict.status === "resolved" && (
                  <span style={{
                    marginLeft: "auto", fontSize: 12, padding: "3px 10px", borderRadius: 100,
                    background: "#f0fdf4", color: "#16a34a", fontWeight: 700,
                    border: "1px solid #86efac", flexShrink: 0,
                  }}>Resolved</span>
                )}
              </div>

              {/* Record IDs */}
              <div style={{ fontSize: 12, color: "#94a3b8", margin: "5px 0 8px", display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 5, fontWeight: 600, color: "#475569" }}>{conflict.recordA}</span>
                <span style={{ color: "#cbd5e1" }}>↔</span>
                <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 5, fontWeight: 600, color: "#475569" }}>{conflict.recordB}</span>
                <span style={{ color: "#e2e8f0", marginLeft: 2 }}>·</span>
                <span style={{ color: "#94a3b8", fontSize: 11 }}>{conflict.conflictId}</span>
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {conflict.departmentsInvolved.map((d) => (
                  <span key={d} className="dept-tag">{d}</span>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <StatusDot type={conflict.statusType} />
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{conflict.reportedAt}</span>
              </div>

              {/* Confidence bar */}
              <div style={{ marginTop: 12, height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${conflict.confidence}%`,
                  background: conflict.confidence >= 80 ? "#22c55e" : conflict.confidence >= 60 ? "#f59e0b" : "#ef4444",
                  borderRadius: 2, transition: "width 0.5s ease",
                }} />
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, textAlign: "right", fontWeight: 500 }}>
                AI confidence {conflict.confidence}%
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <ConflictPopup
          conflict={conflicts.find((c) => c.conflictId === selected.conflictId)}
          role={role}
          onClose={() => setSelected(null)}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
}
