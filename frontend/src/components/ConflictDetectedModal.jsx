// ── Conflict Detected Modal ───────────────────────────────────────────────────
// Reusable popup shown when AI detects a conflict
export function ConflictDetectedModal({ conflict, onViewDetails, onDismiss }) {
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onDismiss()}>
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "2rem",
          width: "100%",
          maxWidth: 460,
          border: "1.5px solid #fecaca",
          animation: "slideIn 0.25s cubic-bezier(0.34,1.2,0.64,1)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#fef2f2",
              border: "2px solid #fecaca",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 7v5M11 15.5v.5" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" />
              <path
                d="M9.27 3.5L2 17a2 2 0 001.73 3h14.54A2 2 0 0020 17L12.73 3.5a2 2 0 00-3.46 0z"
                stroke="#dc2626"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f1923", letterSpacing: "-0.01em" }}>
              Conflict Detected
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
              Your record conflicts with an existing entry
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1.5px solid #e2e8f0",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {conflict.conflictId}
            </span>
            <span className={`badge badge-${conflict.severity.toLowerCase()}`}>{conflict.severity}</span>
          </div>

          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f1923", marginBottom: 8, lineHeight: 1.4 }}>
            {conflict.conflictReason}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {conflict.departmentsInvolved.map((d) => (
              <span key={d} className="dept-tag">
                {d}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "#f0fdf4",
            border: "1.5px solid #86efac",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#16a34a",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            AI Recommendation
          </div>
          <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.55 }}>{conflict.recommendation}</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={onDismiss} style={{ flex: 1 }}>
            Dismiss
          </button>
          <button className="btn btn-submit" onClick={onViewDetails} style={{ flex: 2 }}>
            View Conflict Details →
          </button>
        </div>
      </div>
    </div>
  );
}
