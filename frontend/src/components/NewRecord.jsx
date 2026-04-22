import { useState } from "react";
import { submitRecord } from "../services/aiService";
import mockConflicts from "../data/mockConflicts";
import { ConflictDetectedModal } from "./ConflictDetectedModal";

// ── New Record tab ────────────────────────────────────────────────────────────
// This is the input form page.
// It collects the user's data, sends it to the backend, then shows the AI result.
export function NewRecord({ onViewConflicts, department }) {
  const [form, setForm] = useState({
    title: "",
    category: "",
    location: "",
    equipment: "",
    priority: "Normal",
    shift: "Morning",
    date: "",
    duration: "",
    impact: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [detectedConflict, setDetectedConflict] = useState(null);

  // Updates one field in the form
  function handleChange(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  // Sends the form data to your backend: POST /api/submit-record
  async function handleSubmit() {
    // Basic validation
    if (!form.title || !form.category || !form.description) {
      alert("Please fill in Title, Category and Description.");
      return;
    }

    setLoading(true);
    setAiResult(null);
    setDetectedConflict(null);

    try {
      // Send a clean payload to the backend
      const result = await submitRecord({
        ...form,
        department, // comes from login screen
      });

      // Save the full backend response so we can display it
      setAiResult(result);

      // Try to detect whether the backend says there is a conflict
      const data = result?.data ?? result;

      const conflictDetected = data?.conflict_analysis?.conflict === true;

      // If the AI says there is a conflict, show the modal
      if (conflictDetected) {
        // Build a display object for the modal.
        // This keeps the UI working even if backend response format changes a little.
        setDetectedConflict({
          conflictId: data?.conflictId || data?.executionId || `AI-${Date.now()}`,
          severity: data?.conflict_analysis?.severity || "Medium",
          conflictReason:
            data?.conflict_analysis?.conflict_reason ||
            data?.message ||
            "AI detected a possible scheduling/resource conflict.",
          departmentsInvolved: data?.conflict_analysis?.conflicting_departments || [department].filter(Boolean),
          recommendation:
            data?.decision?.recommendation ||
            data?.recommendation ||
            "Review the record and adjust the schedule or resource allocation.",
        });
      }
    } catch (err) {
      console.error(err);
      alert("AI processing failed");
    } finally {
      setLoading(false);
    }
  }

  // Clears the form and any AI result
  function reset() {
    setForm({
      title: "",
      category: "",
      location: "",
      equipment: "",
      priority: "Normal",
      shift: "Morning",
      date: "",
      duration: "",
      impact: "",
      description: "",
    });
    setAiResult(null);
    setDetectedConflict(null);
  }

  const openCount = mockConflicts.filter((c) => c.status !== "resolved").length;

  return (
    <div style={{ padding: "1.75rem", width: "100%" }}>
      {/* Page header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
        }}
      >
        <h2 className="section-title">New Operational Record</h2>

        <button className="btn-view-conflicts" onClick={onViewConflicts}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            style={{ marginRight: 6 }}
          >
            <path
              d="M7 1.5A3.5 3.5 0 003.5 5v2L2.5 9h9L10.5 7V5A3.5 3.5 0 007 1.5zM5.5 11a1.5 1.5 0 003 0"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          View Active Conflicts
          {openCount > 0 && (
            <span
              style={{
                marginLeft: 7,
                background: "#ef4444",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                padding: "1px 7px",
                borderRadius: 100,
              }}
            >
              {openCount}
            </span>
          )}
        </button>
      </div>

      {/* Input form card */}
      <div
        style={{
          background: "#fff",
          border: "1.5px solid #e2e8f0",
          borderRadius: 14,
          padding: "1.75rem 2rem",
          width: "100%",
        }}
      >
        <div className="form-section-label">Basic Information</div>

        {/* Row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
          <div className="form-group">
            <label>
              Title <span className="required">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Machine M-07 service request"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>
              Category <span className="required">*</span>
            </label>
            <select value={form.category} onChange={(e) => handleChange("category", e.target.value)}>
              <option value="">— Select —</option>
              <option>Maintenance Request</option>
              <option>Production Log</option>
              <option>Incident Report</option>
              <option>Quality Check</option>
              <option>Resource Allocation</option>
              <option>Schedule Change</option>
              <option>Equipment Fault</option>
            </select>
          </div>

          <div className="form-group">
            <label>Priority</label>
            <select value={form.priority} onChange={(e) => handleChange("priority", e.target.value)}>
              <option>Normal</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>

          <div className="form-group">
            <label>Shift</label>
            <select value={form.shift} onChange={(e) => handleChange("shift", e.target.value)}>
              <option>Morning</option>
              <option>Afternoon</option>
              <option>Night</option>
            </select>
          </div>
        </div>

        <div className="form-section-label">Location, Equipment & Schedule</div>

        {/* Row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
          <div className="form-group">
            <label>Location / Area</label>
            <select value={form.location} onChange={(e) => handleChange("location", e.target.value)}>
              <option value="">— Select —</option>
              <option>Line A</option>
              <option>Line B</option>
              <option>Bay 1</option>
              <option>Bay 2</option>
              <option>Bay 3</option>
              <option>Warehouse</option>
              <option>Loading Dock</option>
              <option>Control Room</option>
            </select>
          </div>

          <div className="form-group">
            <label>Equipment / Asset</label>
            <select value={form.equipment} onChange={(e) => handleChange("equipment", e.target.value)}>
              <option value="">— Select —</option>
              <option>Machine M-01</option>
              <option>Machine M-07</option>
              <option>Machine M-12</option>
              <option>Conveyor Belt A</option>
              <option>Forklift F-03</option>
              <option>QC Station 1</option>
              <option>QC Station 2</option>
              <option>N/A</option>
            </select>
          </div>

          <div className="form-group">
            <label>Date Required</label>
            <input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} />
          </div>

          <div className="form-group">
            <label>Estimated Duration</label>
            <select value={form.duration} onChange={(e) => handleChange("duration", e.target.value)}>
              <option value="">— Select —</option>
              <option>Less than 1 hour</option>
              <option>1–2 hours</option>
              <option>2–4 hours</option>
              <option>4–8 hours</option>
              <option>Full day</option>
              <option>Multi-day</option>
            </select>
          </div>
        </div>

        <div className="form-section-label">Details</div>

        {/* Row 3 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 14, marginBottom: 4 }}>
          <div className="form-group">
            <label>Operational Impact</label>
            <select value={form.impact} onChange={(e) => handleChange("impact", e.target.value)}>
              <option value="">— Select —</option>
              <option>No disruption</option>
              <option>Minor disruption</option>
              <option>Partial shutdown</option>
              <option>Full line stop</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              Description <span className="required">*</span>
            </label>
            <textarea
              placeholder="Describe the operational situation, requirements, and any constraints in detail..."
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              style={{ minHeight: 90 }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button className="btn btn-cancel-form" onClick={reset} disabled={loading}>
            Clear
          </button>

          <button className="btn btn-submit" onClick={handleSubmit} disabled={loading}>
            {loading ? "Analyzing..." : "Submit Record"}
          </button>
        </div>

        {/* AI result display */}
        {aiResult && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              background: "#f8fafc",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: 10 }}>AI Result</h4>
            <pre style={{ fontSize: 12, margin: 0, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(aiResult.data ?? aiResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {detectedConflict && (
        <ConflictDetectedModal
          conflict={detectedConflict}
          onViewDetails={() => {
            setDetectedConflict(null);
            onViewConflicts();
          }}
          onDismiss={() => {
            setDetectedConflict(null);
            reset();
          }}
        />
      )}
    </div>
  );
}
