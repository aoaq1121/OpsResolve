import { useState, useRef } from "react";
import { submitRecord } from "../services/aiService";
import { db, collection, addDoc } from "../firebase";
import { ConflictDetectedModal } from "./ConflictDetectedModal";

// Data lists
const CATEGORIES = [
  "Maintenance Request",
  "Production Log",
  "Incident Report",
  "Quality Check",
  "Resource Allocation",
  "Schedule Change",
  "Equipment Fault",
];

const LOCATIONS = [
  "Line A", "Line B", "Line C",
  "Bay 1", "Bay 2", "Bay 3",
  "Warehouse", "Loading Dock", "Control Room",
  "Packaging Area", "QC Lab"
];

const EQUIPMENT = [
  "Machine M-01", "Machine M-07", "Machine M-12",
  "Conveyor Belt A", "Conveyor Belt B",
  "Forklift F-01", "Forklift F-03",
  "QC Station 1", "QC Station 2",
  "Air Compressor AC-01", "Generator G-02",
  "Packaging Robot PR-01", "N/A"
];

const PRIORITY = ["Normal", "High", "Critical"];
const SHIFTS = ["Morning", "Afternoon", "Night"];
const DURATIONS = [
  "Less than 1 hour",
  "1–2 hours",
  "2–4 hours",
  "4–8 hours",
  "Full day",
  "Multi-day"
];
const IMPACT_LEVELS = [
  "No disruption",
  "Minor disruption",
  "Partial shutdown",
  "Full line stop"
];

// ── New Record tab ────────────────────────────────────────────────────────────
// AI-powered form with free-text input and file upload.
// Sends to GLM pipeline for intelligent parsing and conflict detection.
export function NewRecord({ onViewConflicts, department, openConflictCount = 0 }) {
  // Primary input state
  const [userInput, setUserInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // AI-parsed form state
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

  const [stage, setStage] = useState("input"); // "input" | "analysis" | "review"
  const [loading, setLoading] = useState(false);
  const [detectedConflict, setDetectedConflict] = useState(null);
  const [recordAdded, setRecordAdded] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Updates one field in the form
  function handleChange(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: false }));
    }
  }

  // Handle file uploads
  function handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((f) => {
      const isValidType = ["application/pdf", "image/png", "image/jpeg", "image/jpg"].includes(
        f.type
      );
      return isValidType;
    });

    if (validFiles.length !== files.length) {
      alert("Only PDF and image files (PNG, JPG) are supported.");
    }

    setUploadedFiles((prev) => [...prev, ...validFiles]);
  }

  // Remove uploaded file
  function removeFile(index) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // Main AI analysis trigger
  async function handleAnalyzeWithAI() {
    if (!userInput.trim()) {
      alert("Please describe the operational situation first.");
      return;
    }

    setLoading(true);
    setValidationErrors({});

    try {
      // Prepare FormData with text and files
      const formData = new FormData();
      formData.append("description", userInput);
      formData.append("department", department);

      // Add uploaded files to FormData
      uploadedFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      console.log("📤 Sending request with", uploadedFiles.length, "files...");

      // Call AI backend endpoint with FormData (multipart)
      const response = await fetch("http://localhost:5000/api/analyze-input", {
        method: "POST",
        body: formData,
        // Do NOT set Content-Type header - browser will set it with boundary
      });

      console.log("📊 API Response status:", response.status);
      const result = await response.json();
      console.log("📥 API Response body:", result);

      if (!response.ok) {
        console.error("❌ API Error:", result.message || "Unknown error");
        alert(`Failed: ${result.message || "Unknown error"}`);
        return;
      }

      if (result.success && result.aiAnalysis) {
        const aiAnalysis = result.aiAnalysis;

        // Auto-fill form with AI-parsed data
        const newForm = {
          title: aiAnalysis.title || "",
          category: aiAnalysis.category || "",
          location: aiAnalysis.location || "",
          equipment: aiAnalysis.equipment || "",
          priority: aiAnalysis.priority || "Normal",
          shift: aiAnalysis.shift || "Morning",
          date: aiAnalysis.date || "",
          duration: aiAnalysis.duration || "",
          impact: aiAnalysis.impact?.level || "", // Extract level from impact object
          description: userInput,
        };

        console.log("✅ Setting form with parsed data:", newForm);
        setForm(newForm);
        setStage("analysis");

        // Check for required fields
        const errors = {};
        if (!newForm.title) errors.title = true;
        if (!newForm.category) errors.category = true;
        if (!newForm.description) errors.description = true;

        if (Object.keys(errors).length > 0) {
          setValidationErrors(errors);
        }

        // Store full result for AI cards display
        setAiResult({
          success: true,
          aiAnalysis: aiAnalysis, // Store the full aiAnalysis with all agent outputs
        });
      } else {
        console.error("❌ Invalid response structure:", result);
        alert("AI response incomplete. Please try again.");
      }
    } catch (err) {
      console.error("❌ AI analysis error:", err);
      alert("Failed to analyze input. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Submit final record for conflict detection
  async function handleSubmit() {
    // Validate required fields
    const errors = {};
    if (!form.title) errors.title = true;
    if (!form.category) errors.category = true;
    if (!form.description) errors.description = true;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      alert("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setDetectedConflict(null);

    try {
      console.log("💾 Saving record to Firebase...", form);

      // Save directly to Firebase "records" collection
      const docRef = await addDoc(collection(db, "records"), {
        ...form,
        department,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log("✅ Record saved with ID:", docRef.id);
      alert("✅ Record saved successfully!");
      
      // Reset form
      setRecordAdded(true);
      setStage("input");
      reset();
    } catch (err) {
      console.error("❌ Error saving record:", err);
      alert(`❌ Failed to save record: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Clears the form and any AI result
  function reset() {
    setUserInput("");
    setUploadedFiles([]);
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
    setRecordAdded(false);
    setStage("input");
    setValidationErrors({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

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
          {openConflictCount > 0 && (
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
              {openConflictCount}
            </span>
          )}
        </button>
      </div>

      {/* STAGE 1: PRIMARY INPUT SECTION */}
      {stage === "input" && (
        <div
          style={{
            background: "#fff",
            border: "1.5px solid #e2e8f0",
            borderRadius: 14,
            padding: "1.75rem 2rem",
            width: "100%",
          }}
        >
          <div className="form-section-label">AI-Powered Input</div>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
            Describe your operational situation in natural language. Upload supporting documents if available.
            AI will automatically structure and analyze your input.
          </p>

          {/* Textarea: Free-form description */}
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>
              Operational Situation <span className="required">*</span>
            </label>
            <textarea
              placeholder="Describe the operational situation, issue, or request…"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              style={{
                minHeight: 140,
                fontSize: 14,
                fontFamily: "inherit",
                padding: 12,
                border: "1.5px solid #e2e8f0",
                borderRadius: 8,
              }}
            />
          </div>

          {/* File Upload Section */}
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Supporting Documents (Optional)</label>
            <div
              style={{
                border: "2px dashed #cbd5e1",
                borderRadius: 8,
                padding: "2rem",
                textAlign: "center",
                cursor: "pointer",
                background: "#f8fafc",
                transition: "all 0.2s",
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                style={{ margin: "0 auto 8px", color: "#64748b" }}
              >
                <path
                  d="M16 2v20m-8-8l8 8 8-8M4 24h24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: 0 }}>
                Click to upload or drag and drop
              </p>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0 0" }}>
                PDF, PNG, JPG (Max 10MB each)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </div>

            {/* File list */}
            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                  Uploaded Files:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        background: "#f1f5f9",
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M2 1h8l4 4v9H2z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span style={{ flex: 1, color: "#334155" }}>{file.name}</span>
                      <button
                        onClick={() => removeFile(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#94a3b8",
                          cursor: "pointer",
                          fontSize: 16,
                          padding: 0,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button className="btn btn-cancel-form" onClick={reset} disabled={loading}>
              Clear
            </button>
            <button
              className="btn btn-submit"
              onClick={handleAnalyzeWithAI}
              disabled={loading || !userInput.trim()}
              style={{
                background: loading ? "#cbd5e1" : "#3b82f6",
              }}
            >
              {loading ? "Analyzing with AI..." : "🤖 Analyze with AI"}
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: AI UNDERSTANDING PANEL + REVIEW */}
      {stage === "analysis" && (
        <div
          style={{
            background: "#fff",
            border: "1.5px solid #e2e8f0",
            borderRadius: 14,
            padding: "1.75rem 2rem",
            width: "100%",
          }}
        >
          <div className="form-section-label">✨ AI Understanding Panel</div>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
            AI has analyzed your input. Review the structured fields below. Edit any field if needed.
          </p>

          {/* AI Auto-filled Summary Card */}
          <div
            style={{
              background: "#f0f9ff",
              border: "1.5px solid #7dd3fc",
              borderRadius: 10,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0369a1", marginBottom: 12 }}>
              📋 Parsed from your input:
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Title</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginTop: 4 }}>
                  {form.title || "—"}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Category</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginTop: 4 }}>
                  {form.category || "—"}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Location</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginTop: 4 }}>
                  {form.location || "—"}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Equipment</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginTop: 4 }}>
                  {form.equipment || "—"}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Priority</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginTop: 4 }}>
                  {form.priority}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Shift</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginTop: 4 }}>
                  {form.shift}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Duration</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginTop: 4 }}>
                  {form.duration || "—"}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Impact</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginTop: 4 }}>
                  {form.impact || "—"}
                </div>
              </div>
            </div>
          </div>

          {/* IMPACT AGENT CARD */}
          {aiResult?.aiAnalysis?.impact && (
            <div
              style={{
                background: "#fef3c7",
                border: "1.5px solid #fcd34d",
                borderRadius: 10,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 8 }}>
                📊 Operational Impact Analysis
              </div>
              <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.5 }}>
                <strong>Impact Level:</strong> {aiResult.aiAnalysis.impact.level || "Unknown"}
                <br />
                <strong>Reason:</strong> {aiResult.aiAnalysis.impact.reason || "Analysis required"}
                {aiResult.aiAnalysis.impact.riskNotes && (
                  <>
                    <br />
                    <strong>Risk Notes:</strong> {aiResult.aiAnalysis.impact.riskNotes}
                  </>
                )}
              </div>
            </div>
          )}

          {/* CONFLICT AGENT CARD */}
          {aiResult?.aiAnalysis?.conflict && (
            <div
              style={{
                background: aiResult.aiAnalysis.conflict.detected ? "#fee2e2" : "#ecfdf5",
                border: `1.5px solid ${aiResult.aiAnalysis.conflict.detected ? "#fca5a5" : "#86efac"}`,
                borderRadius: 10,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: aiResult.aiAnalysis.conflict.detected ? "#991b1b" : "#166534",
                  marginBottom: 8,
                }}
              >
                {aiResult.aiAnalysis.conflict.detected ? "⚠️ Conflict Detected" : "✅ No Conflicts"}
              </div>
              <div style={{ fontSize: 12, color: aiResult.aiAnalysis.conflict.detected ? "#7f1d1d" : "#065f46", lineHeight: 1.5 }}>
                <strong>Status:</strong> {aiResult.aiAnalysis.conflict.detected ? "Conflict Risk" : "Clear"}
                <br />
                <strong>Severity:</strong> {aiResult.aiAnalysis.conflict.severity || "Low"}
                {aiResult.aiAnalysis.conflict.reason && (
                  <>
                    <br />
                    <strong>Details:</strong> {aiResult.aiAnalysis.conflict.reason}
                  </>
                )}
              </div>
            </div>
          )}

          {/* DECISION AGENT CARD */}
          {aiResult?.aiAnalysis?.decision && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1.5px solid #86efac",
                borderRadius: 10,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "#166534", marginBottom: 8 }}>
                🎯 Recommended Action
              </div>
              <div style={{ fontSize: 12, color: "#065f46", lineHeight: 1.5 }}>
                <strong>Action:</strong> {aiResult.aiAnalysis.decision.actionType || "Review"}
                <br />
                <strong>Recommendation:</strong> {aiResult.aiAnalysis.decision.recommendation || "Proceed with record"}
                <br />
                <strong>Confidence:</strong> {aiResult.aiAnalysis.decision.confidence || 0}%
                {aiResult.aiAnalysis.decision.escalationNeeded && (
                  <>
                    <br />
                    <span style={{ color: "#dc2626", fontWeight: 600 }}>🚨 Escalation Needed</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Conflict Risk Warning (if any) - LEGACY */}
          {aiResult?.conflict && (
            <div
              style={{
                background: "#fef2f2",
                border: "1.5px solid #fca5a5",
                borderRadius: 10,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ fontSize: 18, marginTop: 2 }}>⚠️</div>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#991b1b",
                      marginBottom: 4,
                    }}
                  >
                    Conflict Risk Detected
                  </div>
                  <div style={{ fontSize: 12, color: "#7f1d1d", lineHeight: 1.4 }}>
                    <strong>Severity:</strong> {aiResult.severity || "Medium"}
                    <br />
                    <strong>Reason:</strong>{" "}
                    {aiResult.aiSummary?.conflictReason || "Potential resource overlap detected"}
                    <br />
                    <strong>Recommendation:</strong>{" "}
                    {aiResult.aiSummary?.recommendation || "Review affected departments"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Editable Form Section */}
          <div className="form-section-label">📝 Edit Required Fields</div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
            <div className="form-group">
              <label>
                Title <span className="required">*</span>
                {validationErrors.title && (
                  <span style={{ color: "#ef4444", fontSize: 11, marginLeft: 4 }}>
                    Required
                  </span>
                )}
              </label>
              <input
                type="text"
                placeholder="Auto-filled title. Edit if needed."
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                style={{
                  borderColor: validationErrors.title ? "#ef4444" : "#e2e8f0",
                }}
              />
            </div>

            <div className="form-group">
              <label>
                Category <span className="required">*</span>
                {validationErrors.category && (
                  <span style={{ color: "#ef4444", fontSize: 11, marginLeft: 4 }}>
                    Required
                  </span>
                )}
              </label>
              <select
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                style={{
                  borderColor: validationErrors.category ? "#ef4444" : "#e2e8f0",
                }}
              >
                <option value="">— Select —</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => handleChange("priority", e.target.value)}>
                {PRIORITY.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Shift</label>
              <select value={form.shift} onChange={(e) => handleChange("shift", e.target.value)}>
                {SHIFTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
            <div className="form-group">
              <label>Location / Area</label>
              <select value={form.location} onChange={(e) => handleChange("location", e.target.value)}>
                <option value="">— Select —</option>
                {LOCATIONS.map((loc) => (
                  <option key={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Equipment / Asset</label>
              <select value={form.equipment} onChange={(e) => handleChange("equipment", e.target.value)}>
                <option value="">— Select —</option>
                {EQUIPMENT.map((eq) => (
                  <option key={eq}>{eq}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Date Required</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => handleChange("date", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Estimated Duration</label>
              <select value={form.duration} onChange={(e) => handleChange("duration", e.target.value)}>
                <option value="">— Select —</option>
                {DURATIONS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 14, marginBottom: 20 }}>
            <div className="form-group">
              <label>Operational Impact</label>
              <select value={form.impact} onChange={(e) => handleChange("impact", e.target.value)}>
                <option value="">— Select —</option>
                {IMPACT_LEVELS.map((imp) => (
                  <option key={imp}>{imp}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                Description <span className="required">*</span>
              </label>
              <textarea
                placeholder="Your original input, used as description..."
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                style={{ minHeight: 90 }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button className="btn btn-cancel-form" onClick={reset} disabled={loading}>
              Back to Input
            </button>

            <button className="btn btn-submit" onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit Record"}
            </button>
          </div>

          {recordAdded && (
            <div
              style={{
                marginTop: 16,
                background: "#f0fdf4",
                border: "1.5px solid #86efac",
                borderRadius: 10,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                animation: "fadeUp 0.3s ease",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#dcfce7",
                  border: "1.5px solid #86efac",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8l3.5 3.5 7-7"
                    stroke="#16a34a"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>
                  Record added successfully
                </div>
                <div style={{ fontSize: 13, color: "#166534", marginTop: 2 }}>
                  No conflicts detected with existing records.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
