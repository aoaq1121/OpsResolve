import { useState, useEffect, useCallback } from "react";

export default function DecisionReview({ role }) {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);

  const isManager = role === "manager";
  const isSupervisor = role === "supervisor";

  const fetchPendingConflicts = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:3001/api/conflicts");
      const data = await response.json();
      const raw = Array.isArray(data) ? data : data.data || [];
      
      const pendingConflicts = raw.filter(c => 
        c.status !== "resolved" && c.status !== "overridden" && c.status !== "accepted"
      );
      
      setConflicts(pendingConflicts);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch conflicts:", error);
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPendingConflicts();
    const interval = setInterval(fetchPendingConflicts, 5000);
    return () => clearInterval(interval);
  }, [fetchPendingConflicts]);

  async function handleNotify(conflict) {
    try {
      await fetch(`http://localhost:3001/api/conflicts/${conflict.conflictId || conflict.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "notified" })
      });
      alert("✅ All parties notified");
      fetchPendingConflicts();
    } catch (error) {
      console.error("Failed to notify:", error);
      alert("❌ Failed to notify");
    }
  }

  async function handleSchedule(conflict) {
    try {
      await fetch(`http://localhost:3001/api/conflicts/${conflict.conflictId || conflict.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "scheduled" })
      });
      alert("📅 Meeting scheduled");
      fetchPendingConflicts();
    } catch (error) {
      console.error("Failed to schedule:", error);
      alert("❌ Failed to schedule");
    }
  }

  async function handleAccept(conflict) {
    try {
      await fetch(`http://localhost:3001/api/conflicts/${conflict.conflictId || conflict.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" })
      });
      
      await fetch("http://localhost:3001/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conflictId: conflict.conflictId || conflict.id,
          managerAction: "accepted",
          finalNote: "Accepted AI recommendation.",
          timestamp: new Date().toISOString()
        })
      });
      
      alert("✅ Recommendation accepted - conflict resolved");
      fetchPendingConflicts();
    } catch (error) {
      console.error("Failed to accept:", error);
      alert("❌ Failed to accept");
    }
  }

  async function handleOverride(conflict) {
    const reason = prompt("Enter override reason:");
    if (!reason) return;
    
    try {
      await fetch(`http://localhost:3001/api/conflicts/${conflict.conflictId || conflict.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "overridden" })
      });
      
      await fetch("http://localhost:3001/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conflictId: conflict.conflictId || conflict.id,
          managerAction: "overridden",
          finalNote: reason,
          overrideReason: reason,
          timestamp: new Date().toISOString()
        })
      });
      
      alert("⚠️ Override logged - conflict resolved");
      fetchPendingConflicts();
    } catch (error) {
      console.error("Failed to override:", error);
      alert("❌ Failed to override");
    }
  }

  if (!isManager && !isSupervisor) {
    return (
      <div className="tab-content">
        <div className="empty-state" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ fontSize: 16, color: "#64748b" }}>🔒 Decision Review requires Supervisor or Manager access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h2 className="section-title" style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>Decision Review</h2>
          {conflicts.length > 0 && (
            <span style={{ background: "#fee2e2", color: "#ef4444", padding: "2px 10px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold" }}>
              {conflicts.length} pending
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
          Loading decisions...
        </div>
      ) : conflicts.length === 0 ? (
        <div className="empty-state" style={{ textAlign: "center", padding: "3rem", background: "#f8fafc", borderRadius: "16px" }}>
          <p style={{ fontSize: 16, color: "#64748b" }}>✅ No pending decisions to review!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {conflicts.map((conflict) => (
            <div 
              key={conflict.conflictId || conflict.id} 
              style={{
                background: "white",
                borderRadius: "14px",
                padding: "20px",
                border: "1px solid #e2e8f0",
                borderLeft: `6px solid ${conflict.severity === "High" ? "#ef4444" : conflict.severity === "Medium" ? "#f59e0b" : "#3b82f6"}`,
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
                </div>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>ID: {(conflict.conflictId || conflict.id).slice(0, 8)}</span>
              </div>
              
              <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
                {conflict.conflictReason || "Conflict detected"}
              </h3>
              
              <div style={{ background: "#eff6ff", padding: "12px", borderRadius: "10px", marginBottom: "16px" }}>
                <strong style={{ color: "#2563eb", fontSize: "12px" }}>💡 AI Recommendation:</strong>
                <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#1e3a8a" }}>
                  {conflict.recommendation || conflict.ai_recommendation || "Coordinate with affected departments."}
                </p>
              </div>
              
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button 
                  onClick={() => handleNotify(conflict)}
                  style={{ flex: 1, padding: "10px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: "600", fontSize: "13px", color: "#334155" }}
                >
                  Notify All
                </button>
                <button 
                  onClick={() => handleSchedule(conflict)}
                  style={{ flex: 1, padding: "10px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: "600", fontSize: "13px", color: "#334155" }}
                >
                  Schedule Meeting
                </button>
                {isManager && (
                  <button 
                    onClick={() => handleAccept(conflict)}
                    style={{ flex: 1, padding: "10px 16px", borderRadius: "8px", border: "none", background: "#16a34a", color: "#fff", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
                  >
                    Accept Recommendation
                  </button>
                )}
                {isManager && (
                  <button 
                    onClick={() => handleOverride(conflict)}
                    style={{ flex: 1, padding: "10px 16px", borderRadius: "8px", border: "1.5px solid #dc2626", background: "#fff", color: "#dc2626", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
                  >
                    Override
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}