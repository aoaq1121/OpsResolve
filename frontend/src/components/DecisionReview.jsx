import { useEffect, useMemo, useState } from "react";
import { db, collection, onSnapshot } from "../firebase";

export function DecisionReview() {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "conflicts"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setConflicts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const decisionGroups = useMemo(() => {
    const groups = {};

    conflicts.forEach((record) => {
      const groupId = record.conflictId || record.location || "unassigned";
      const priority = record.priority || record.severity || "Medium";
      const shouldShow =
        record.status === "resolved" ||
        record.status === "overridden" ||
        record.resolutionType === "AI_ACCEPTED" ||
        record.resolvedBy === "Manager";
      if (!shouldShow) return;

      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          title: record.title,
          priority,
          involvedRecords: [],
          statusList: [],
          managerDecision: null,
          finalSolution: null,
        };
      }

      groups[groupId].involvedRecords.push(record);
      groups[groupId].statusList.push(record.status);

      if (!groups[groupId].managerDecision) {
        if (record.resolutionType === "AI_ACCEPTED") {
          groups[groupId].managerDecision = "Accepted AI recommendation";
        } else if (record.resolvedBy === "Manager" || record.status === "overridden") {
          groups[groupId].managerDecision = "Manual override";
        }
      }

      if (!groups[groupId].finalSolution && record.finalSolution) {
        groups[groupId].finalSolution = record.finalSolution;
      }
    });

    return Object.values(groups)
      .filter((group) => group.involvedRecords.length > 1)
      .map((group) => {
        const hasPending = group.statusList.includes("pending");
        const hasOverridden = group.statusList.includes("overridden");
        const hasResolved = group.statusList.includes("resolved");
        const status = hasPending
          ? "pending"
          : hasOverridden
          ? "overridden"
          : hasResolved
          ? "resolved"
          : group.statusList[0] || "resolved";

        return {
          ...group,
          status,
          statusLabel:
            status === "pending"
              ? "Pending"
              : status === "resolved"
              ? "Resolved"
              : status === "overridden"
              ? "Overridden"
              : status.charAt(0).toUpperCase() + status.slice(1),
        };
      })
      .filter((group) => group.status !== "pending")
      .filter((group) =>
        !searchTerm ||
        group.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.managerDecision?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.involvedRecords.some((record) =>
          record.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
  }, [conflicts, searchTerm]);

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading Decision Review...</div>;
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 700 }}>Decision Review</h2>
        </div>
        <input
          type="text"
          placeholder="Search decisions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", width: "240px" }}
        />
      </div>

      {decisionGroups.length === 0 ? (
        <div style={{ padding: "2rem", background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0", color: "#475569" }}>
          No manager-reviewed conflicts found yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {decisionGroups.map((group) => (
            <div key={group.id} style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "20px" }}>Conflict Case: {group.involvedRecords[0]?.location || "General Area"}</h3>
                  <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "14px" }}>
                    {group.involvedRecords.length} overlapping activities
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, padding: "6px 12px", borderRadius: "999px", background: group.status === "resolved" ? "#d1fae5" : "#fee2e2", color: group.status === "resolved" ? "#065f46" : "#991b1b" }}>
                    {group.statusLabel}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, padding: "6px 12px", borderRadius: "999px", background: "#e0f2fe", color: "#0369a1" }}>
                    {group.managerDecision || "Decision recorded"}
                  </span>
                </div>
              </div>

              <p style={{ margin: "18px 0 0", color: "#475569", fontSize: "14px" }}>
                <strong>Involved:</strong> {group.involvedRecords.map((record) => record.title).join(" ↔️ ")}
              </p>

              {group.finalSolution && (
                <div style={{ marginTop: "16px", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <strong>Manager override note:</strong> {group.finalSolution}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
