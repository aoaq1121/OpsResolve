<<<<<<< HEAD
// ── Review & Approval ──────────────────────────────────────────────────────────
import { useState, useEffect } from "react";

export function ReviewApproval() {
  const [decisions, setDecisions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");

  // Fetch decisions and reviews on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [decisionsRes, reviewsRes] = await Promise.all([
        fetch("http://localhost:3001/api/decisions"),
        fetch("http://localhost:3001/api/reviews")
      ]);

      const decisionsData = await decisionsRes.json();
      const reviewsData = await reviewsRes.json();

      setDecisions(decisionsData);
      setReviews(reviewsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get decisions that haven't been reviewed yet
  const pendingDecisions = decisions.filter(decision =>
    !reviews.some(review => review.decision_id === decision.id)
  );

  const handleApprove = async (decisionId) => {
    try {
      const reviewData = {
        decision_id: decisionId,
        approved: true,
        notes: reviewNotes,
        reviewer: "Person 5"
      };

      const response = await fetch("http://localhost:3001/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewData)
      });

      if (response.ok) {
        alert("Decision approved successfully!");
        setReviewNotes("");
        setSelectedDecision(null);
        fetchData();
      }
    } catch (error) {
      console.error("Error approving decision:", error);
      alert("Failed to approve decision");
    }
  };

  const handleReject = async (decisionId) => {
    try {
      const reviewData = {
        decision_id: decisionId,
        approved: false,
        notes: reviewNotes,
        reviewer: "Person 5"
      };

      const response = await fetch("http://localhost:3001/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewData)
      });

      if (response.ok) {
        alert("Decision rejected with feedback");
        setReviewNotes("");
        setSelectedDecision(null);
        fetchData();
      }
    } catch (error) {
      console.error("Error rejecting decision:", error);
      alert("Failed to reject decision");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "1.75rem", textAlign: "center" }}>
        <p>Loading decisions...</p>
      </div>
    );
  }

=======
// ── Review & Approval placeholder ───────────────────────────────────────────────
export function ReviewApproval() {
>>>>>>> main
  return (
    <div style={{ padding: "1.75rem" }}>
      <h2 className="section-title" style={{ marginBottom: "1rem" }}>
        Review & Approval
      </h2>
<<<<<<< HEAD

      {pendingDecisions.length === 0 ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>
          <p>No pending decisions to review</p>
        </div>
      ) : (
        <div>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
            Review decisions made by Person 4 and provide final approval
          </p>

          <div style={{ display: "grid", gap: "1rem" }}>
            {pendingDecisions.map((decision) => (
              <div
                key={decision.id}
                style={{
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  padding: "1rem",
                  backgroundColor: "#1f2937"
                }}
              >
                <div style={{ marginBottom: "0.75rem" }}>
                  <h3 style={{ margin: "0 0 0.5rem 0", color: "#f3f4f6" }}>
                    Decision: {decision.action_taken || "Resolution Action"}
                  </h3>
                  <p style={{ margin: "0", color: "#9ca3af", fontSize: "14px" }}>
                    Conflict ID: {decision.conflict_id} | Decision Type: {decision.decision_type}
                  </p>
                  <p style={{ margin: "0.25rem 0 0 0", color: "#6b7280", fontSize: "12px" }}>
                    Made at: {new Date(decision.timestamp).toLocaleString()}
                  </p>
                </div>

                {selectedDecision === decision.id ? (
                  <div style={{ marginTop: "1rem" }}>
                    <textarea
                      placeholder="Add review notes (optional)"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      style={{
                        width: "100%",
                        minHeight: "80px",
                        padding: "0.5rem",
                        backgroundColor: "#111827",
                        border: "1px solid #374151",
                        borderRadius: "4px",
                        color: "#f3f4f6",
                        fontSize: "14px",
                        marginBottom: "1rem"
                      }}
                    />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => handleApprove(decision.id)}
                        style={{
                          padding: "0.5rem 1rem",
                          backgroundColor: "#10b981",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => handleReject(decision.id)}
                        style={{
                          padding: "0.5rem 1rem",
                          backgroundColor: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        ❌ Reject
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDecision(null);
                          setReviewNotes("");
                        }}
                        style={{
                          padding: "0.5rem 1rem",
                          backgroundColor: "#6b7280",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedDecision(decision.id)}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Review Decision
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ color: "#f3f4f6", marginBottom: "1rem" }}>Completed Reviews</h3>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {reviews.slice(0, 5).map((review) => (
              <div
                key={review.id}
                style={{
                  padding: "0.75rem",
                  backgroundColor: "#111827",
                  borderRadius: "4px",
                  border: "1px solid #374151"
                }}
              >
                <span style={{ color: review.approved ? "#10b981" : "#ef4444" }}>
                  {review.approved ? "✅ Approved" : "❌ Rejected"}
                </span>
                <span style={{ color: "#6b7280", marginLeft: "0.5rem", fontSize: "12px" }}>
                  Decision ID: {review.decision_id}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
=======
      <p style={{ color: "#94a3b8", fontSize: 14 }}>
        Review & Approval — implemented by team member (Person 5).
      </p>
    </div>
  );
}
>>>>>>> main
