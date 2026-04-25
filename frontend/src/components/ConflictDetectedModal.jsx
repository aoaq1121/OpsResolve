// ── Conflict Detected Modal ───────────────────────────────────────────────────

function parsePoints(text) {
  if (!text || text === "—") return [];
  return text.split(/(?<=[.!?])\s+|;\s*/).map((s) => s.trim()).filter((s) => s.length > 10);
}

export function ConflictDetectedModal({ conflict, onViewDetails, onDismiss }) {
  const reasonPoints = parsePoints(conflict.conflictReason);
  const recommendationPoints = parsePoints(conflict.recommendation);
  const pointLabels = ["Concern", "Issue", "Risk", "Impact", "Note"];
  const recLabels = ["Action", "Step", "Note", "Risk", "Next"];

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onDismiss()}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "2rem",
        width: "100%", maxWidth: 460, border: "1.5px solid #fecaca",
        animation: "slideIn 0.25s cubic-bezier(0.34,1.2,0.64,1)", position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fef2f2", border: "2px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 7v5M11 15.5v.5" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M9.27 3.5L2 17a2 2 0 001.73 3h14.54A2 2 0 0020 17L12.73 3.5a2 2 0 00-3.46 0z" stroke="#dc2626" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f1923", letterSpacing: "-0.01em" }}>Conflict Detected</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Your record conflicts with an existing entry</div>
          </div>
        </div>

        {/* Conflict reason card */}
        <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
          {/* Header: ID + severity + departments on same row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {conflict.conflictId}
            </span>
            <span className={`badge badge-${conflict.severity.toLowerCase()}`}>{conflict.severity}</span>
            {conflict.departmentsInvolved.map((d) => (
              <span key={d} className="dept-tag">{d}</span>
            ))}
          </div>

          {reasonPoints.length > 1 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reasonPoints.map((point, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", minWidth: 65, flexShrink: 0 }}>
                    {pointLabels[i] || "Detail"}:
                  </span>
                  <span style={{ fontSize: 13, color: "#0f1923", lineHeight: 1.55, textAlign: "left" }}>{point}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#0f1923", lineHeight: 1.5, textAlign: "left" }}>
              {conflict.conflictReason}
            </div>
          )}
        </div>

        {/* AI Recommendation card */}
        <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            AI Recommendation
          </div>
          {recommendationPoints.length > 1 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recommendationPoints.map((point, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", minWidth: 45, flexShrink: 0 }}>
                    {recLabels[i] || "Step"}:
                  </span>
                  <span style={{ fontSize: 13, color: "#166534", lineHeight: 1.55, textAlign: "left" }}>{point}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.55, textAlign: "left" }}>{conflict.recommendation}</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={onDismiss} style={{ flex: 1 }}>Dismiss</button>
          <button className="btn btn-submit" onClick={onViewDetails} style={{ flex: 2 }}>View Conflict Details →</button>
        </div>
      </div>
    </div>
  );
}
