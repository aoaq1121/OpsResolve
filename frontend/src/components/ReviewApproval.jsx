import { useState, useEffect, useCallback } from "react";

export default function ReviewApproval({ role }) {
  const [resolvedConflicts, setResolvedConflicts] = useState([]);
  const [loading, setLoading] = useState(true);

  const isManager = role === "manager";

  const fetchResolvedConflicts = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:3001/api/conflicts");
      const data = await response.json();
      const raw = Array.isArray(data) ? data : data.data || [];
      
      const completedConflicts = raw.filter(c => 
        c.status === "resolved" || c.status === "overridden" || c.status === "accepted"
      );
      
      setResolvedConflicts(completedConflicts);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch resolved conflicts:", error);
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchResolvedConflicts();
    const interval = setInterval(fetchResolvedConflicts, 10000);
    return () => clearInterval(interval);
  }, [fetchResolvedConflicts]);

  if (!isManager) {
    return (
      <div className="tab-content">
        <div className="empty-state" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ fontSize: 16, color: "#64748b" }}>🔒 Review & Approval is only available for Managers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h2 className="section-title" style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>Review & Approval</h2>
          {resolvedConflicts.length > 0 && (
            <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 10px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold" }}>
              {resolvedConflicts.length} completed
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
          Loading completed conflicts...
        </div>
      ) : resolvedConflicts.length === 0 ? (
        <div className="empty-state" style={{ textAlign: "center", padding: "3rem", background: "#f8fafc", borderRadius: "16px" }}>
          <p style={{ fontSize: 16, color: "#64748b" }}>📋 No completed conflicts to review.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {resolvedConflicts.map((conflict) => (
            <div 
              key={conflict.conflictId || conflict.id} 
              style={{
                background: "white",
                borderRadius: "14px",
                padding: "20px",
                border: "1px solid #e2e8f0",
                borderLeft: `6px solid ${conflict.status === "overridden" ? "#dc2626" : "#22c55e"}`,
                marginBottom: "16px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span className="badge" style={{
                    padding: "3px 9px",
                    borderRadius: "100px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: conflict.severity === "High" ? "#fef2f2" : conflict.severity === "Medium" ? "#fffbeb" : "#f1f5f9",
                    color: conflict.severity === "High" ? "#dc2626" : conflict.severity === "Medium" ? "#d97706" : "#475569"
                  }}>
                    {conflict.severity || "Medium"}
                  </span>
                  {conflict.status === "overridden" ? (
                    <span style={{ background: "#fef2f2", color: "#dc2626", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 }}>
                      Overridden
                    </span>
                  ) : (
                    <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 }}>
                      Resolved
                    </span>
                  )}
                </div>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>ID: {(conflict.conflictId || conflict.id).slice(0, 8)}</span>
              </div>
              
              <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
                {conflict.conflictReason || "Conflict resolved"}
              </h3>
              
              <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "12px", color: "#64748b" }}>
                <span><strong>Resolved at:</strong> {conflict.last_detected ? new Date(conflict.last_detected).toLocaleDateString() : "—"}</span>
              </div>
              
              {conflict.recommendation && (
                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", fontSize: "13px", border: "1px solid #e2e8f0" }}>
                  <strong>Resolution:</strong> {conflict.recommendation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}