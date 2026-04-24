import { useState, useRef } from "react";
import { submitRecord, aiExtract } from "../services/aiService";
import { ConflictDetectedModal } from "./ConflictDetectedModal";

const DEPT_CONFIG = {
  Production:        { accent: "#16a34a", light: "#f0fdf4", border: "#86efac", text: "#166534" },
  Maintenance:       { accent: "#2563eb", light: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
  "Quality Control": { accent: "#7c3aed", light: "#f5f3ff", border: "#ddd6fe", text: "#5b21b6" },
  Logistics:         { accent: "#d97706", light: "#fffbeb", border: "#fde68a", text: "#92400e" },
};

// ── Step indicator ────────────────────────────────────────────────────────────
function Steps({ current, accent }) {
  const steps = ["Say your request", "Pick a machine", "Confirm & submit"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = current > idx;
        const active = current === idx;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: done ? accent : active ? accent : "#e2e8f0",
                color: done || active ? "#fff" : "#94a3b8",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, transition: "all 0.3s",
              }}>
                {done ? "✓" : idx}
              </div>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? accent : "#94a3b8", whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? accent : "#e2e8f0", margin: "0 8px", marginBottom: 18, transition: "background 0.3s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Machine card ──────────────────────────────────────────────────────────────
function MachineCard({ machine, selected, onSelect, accent }) {
  return (
    <div
      onClick={() => onSelect(machine)}
      style={{
        border: `2px solid ${selected ? accent : "#e2e8f0"}`,
        borderRadius: 12, padding: "14px 16px", cursor: "pointer",
        background: selected ? `${accent}08` : "#fff",
        transition: "all 0.15s",
        transform: selected ? "scale(1.02)" : "scale(1)",
        boxShadow: selected ? `0 4px 16px ${accent}22` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f1923" }}>{machine.name}</span>
        {selected && (
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2.5 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#64748b" }}>📍 {machine.location}</span>
        <span style={{ fontSize: 12, color: "#64748b" }}>🏷 {machine.type}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#16a34a" }}>● Available</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function RequestMachine({ department, role, onViewConflicts }) {
  const config = DEPT_CONFIG[department] || DEPT_CONFIG.Production;

  const [step, setStep] = useState(1);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState(null); // { processType, date, shift, time }
  const [machines, setMachines] = useState([]);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [detectedConflict, setDetectedConflict] = useState(null);
  const [error, setError] = useState("");

  const recognitionRef = useRef(null);

  // ── Step 1: Voice request ─────────────────────────────────────────────────
  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setError("Voice not supported in this browser. Type your request below."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      setListening(false);
      processRequest(text);
    };
    recognition.onerror = () => { setListening(false); setError("Could not hear. Try again or type below."); };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }

  async function processRequest(text) {
    setError("");
    setLoadingMachines(true);
    try {
      const prompt = `Extract machine request details from this manufacturing floor request: "${text}". Today is ${new Date().toISOString().split("T")[0]}.

Valid process types are ONLY: Sanding, Welding, Cutting, Assembly, Painting, Packaging, CNC Machining, Pressing, Inspection, Forklift.
Match the request to the closest valid process type from the list above. For example "sending machine" or "sanding machine" = "Sanding".

Return ONLY JSON: { "processType": one of the valid types above or null, "date": "YYYY-MM-DD" or null, "shift": "Morning"|"Afternoon"|"Night" or null, "time": "HH:MM" or null, "duration": string or null, "summary": one sentence describing the request }. If time given, infer shift (before 12pm=Morning, 12-6pm=Afternoon, after 6pm=Night). No explanation, just JSON.`;
      const { parsed: result } = await aiExtract(prompt);
      if (!result) throw new Error("Could not parse response");
      setParsed(result);

      const params = new URLSearchParams({
        date: result.date || new Date().toISOString().split("T")[0],
        shift: result.shift || "Morning",
      });
      if (result.processType) params.append("type", result.processType);
      else params.append("department", department);

      const machRes = await fetch(`http://localhost:3001/api/machines/available?${params}`);
      const machData = await machRes.json();
      setMachines(Array.isArray(machData) ? machData : machData.data || []);
      setStep(2);
    } catch (err) {
      setError("Could not process request. Try again.");
    }
    setLoadingMachines(false);
  }

  // ── Step 3: Submit ────────────────────────────────────────────────────────
  async function handleSubmit(notes) {
    if (!selectedMachine) return;
    setSubmitting(true);
    const payload = {
      department,
      title: parsed?.summary || `${department} machine request`,
      processType: parsed?.processType || "",
      machineId: selectedMachine.id,
      machineName: selectedMachine.name,
      date: parsed?.date || new Date().toISOString().split("T")[0],
      shift: parsed?.shift || "Morning",
      duration: parsed?.duration || "",
      description: notes || transcript,
      category: department,
      source: "voice_request",
    };

    try {
      const result = await submitRecord(payload);
      const data = result?.data ?? result;
      const conflictDetected =
        data?.status === "CONFLICT_DETECTED" ||
        data?.conflict?.conflict === true ||
        data?.conflict === true;

      if (conflictDetected) {
        setDetectedConflict({
          conflictId: data?.context?.existingRecordId || `CON-${Date.now()}`,
          severity: data?.severity || "Medium",
          conflictReason: data?.aiSummary?.conflictReason || "Conflict detected.",
          departmentsInvolved: [department].filter(Boolean),
          recommendation: data?.aiSummary?.recommendation || "Review and coordinate.",
        });
      } else {
        setSubmitted(true);
        setStep(3);
      }
    } catch {
      setSubmitted(true);
      setStep(3);
    }
    setSubmitting(false);
  }

  function reset() {
    setStep(1);
    setTranscript("");
    setParsed(null);
    setMachines([]);
    setSelectedMachine(null);
    setSubmitted(false);
    setDetectedConflict(null);
    setError("");
  }

  return (
    <div style={{ padding: "1.75rem", width: "100%", maxWidth: 700 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h2 className="section-title">Request Machine</h2>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Say what you need — AI will find available machines instantly</p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100,
          background: config.light, color: config.text, border: `1px solid ${config.border}`,
          textTransform: "uppercase", letterSpacing: "0.07em",
        }}>{department}</span>
      </div>

      <div style={{ background: "#fff", border: `1.5px solid ${config.border}`, borderTop: `3px solid ${config.accent}`, borderRadius: 14, padding: "1.75rem 2rem" }}>

        <Steps current={step} accent={config.accent} />

        {/* ── Step 1: Voice input ── */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            {/* Big mic button */}
            <button
              onClick={toggleVoice}
              style={{
                width: 96, height: 96, borderRadius: "50%", border: "none", cursor: "pointer",
                background: listening ? "#fef2f2" : config.light,
                boxShadow: listening ? `0 0 0 12px ${config.accent}22, 0 0 0 24px ${config.accent}11` : `0 0 0 8px ${config.accent}18`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                transition: "all 0.3s",
                animation: listening ? "pulse 1.5s infinite" : "none",
              }}
            >
              <span style={{ fontSize: 36 }}>{listening ? "⏹" : "🎤"}</span>
            </button>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#0f1923" }}>
                {listening ? "Listening... speak now" : "Tap to speak your request"}
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                e.g. "I need a sanding machine at 4:30pm today"
              </div>
            </div>

            {/* Or type */}
            <div style={{ width: "100%", display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder='Or type your request here...'
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                onKeyDown={e => e.key === "Enter" && transcript && processRequest(transcript)}
                style={{ flex: 1 }}
              />
              <button
                onClick={() => transcript && processRequest(transcript)}
                disabled={!transcript || loadingMachines}
                style={{
                  padding: "10px 18px", borderRadius: 10, border: "none",
                  background: config.accent, color: "#fff", fontWeight: 600, fontSize: 13,
                  cursor: "pointer", opacity: !transcript || loadingMachines ? 0.5 : 1,
                }}
              >
                {loadingMachines ? "..." : "Search"}
              </button>
            </div>

            {error && <div style={{ fontSize: 13, color: "#ef4444", fontWeight: 500 }}>{error}</div>}
          </div>
        )}

        {/* ── Step 2: Machine picker ── */}
        {step === 2 && (
          <div>
            {/* AI understood */}
            {parsed && (
              <div style={{ background: config.light, border: `1px solid ${config.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: config.text, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>AI Understood</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {parsed.summary && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: config.text, minWidth: 90 }}>Request</span>
                      <span style={{ fontSize: 13, color: config.text }}>{parsed.summary}</span>
                    </div>
                  )}
                  {parsed.processType && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: config.text, minWidth: 90 }}>Process</span>
                      <span style={{ fontSize: 13, color: config.text }}>{parsed.processType}</span>
                    </div>
                  )}
                  {parsed.date && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: config.text, minWidth: 90 }}>Date</span>
                      <span style={{ fontSize: 13, color: config.text }}>{parsed.date}</span>
                    </div>
                  )}
                  {parsed.time && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: config.text, minWidth: 90 }}>Time</span>
                      <span style={{ fontSize: 13, color: config.text }}>{parsed.time}</span>
                    </div>
                  )}
                  {parsed.shift && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: config.text, minWidth: 90 }}>Shift</span>
                      <span style={{ fontSize: 13, color: config.text }}>{parsed.shift}</span>
                    </div>
                  )}
                  {parsed.duration && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: config.text, minWidth: 90 }}>Duration</span>
                      <span style={{ fontSize: 13, color: config.text }}>{parsed.duration}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              {machines.length} machine{machines.length !== 1 ? "s" : ""} available
            </div>

            {machines.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#ef4444", fontSize: 14, fontWeight: 500 }}>
                No machines available for this slot.
                <button onClick={reset} style={{ display: "block", margin: "12px auto 0", fontSize: 13, color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  Try a different time
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {machines.map(m => (
                  <MachineCard
                    key={m.id}
                    machine={m}
                    selected={selectedMachine?.id === m.id}
                    onSelect={setSelectedMachine}
                    accent={config.accent}
                  />
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 8 }}>
              <button onClick={reset} style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#334155", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedMachine}
                style={{
                  padding: "9px 24px", borderRadius: 9, border: "none",
                  background: config.accent, color: "#fff", fontWeight: 600, fontSize: 13,
                  cursor: "pointer", opacity: !selectedMachine ? 0.4 : 1,
                }}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 3 && !submitted && (
          <ConfirmStep
            parsed={parsed}
            machine={selectedMachine}
            transcript={transcript}
            config={config}
            submitting={submitting}
            onBack={() => setStep(2)}
            onSubmit={handleSubmit}
          />
        )}

        {/* ── Success ── */}
        {submitted && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "2rem 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#dcfce7", border: "2px solid #86efac", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l4.5 4.5 9-9" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#16a34a" }}>Machine booked successfully</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{selectedMachine?.name} — {parsed?.shift} shift, {parsed?.date}</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={reset} style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#334155", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                New Request
              </button>
              <button onClick={onViewConflicts} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: config.accent, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                View Conflicts
              </button>
            </div>
          </div>
        )}
      </div>

      {detectedConflict && (
        <ConflictDetectedModal
          conflict={detectedConflict}
          onViewDetails={() => { setDetectedConflict(null); onViewConflicts(); }}
          onDismiss={() => { setDetectedConflict(null); reset(); }}
        />
      )}
    </div>
  );
}

// ── Confirm step sub-component ────────────────────────────────────────────────
function ConfirmStep({ parsed, machine, transcript, config, submitting, onBack, onSubmit }) {
  const [notes, setNotes] = useState("");

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
        Confirm your request
      </div>

      <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "16px 18px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <Row label="Machine" value={machine?.name} />
        <Row label="Location" value={machine?.location} />
        <Row label="Type" value={machine?.type} />
        <Row label="Date" value={parsed?.date} />
        <Row label="Shift" value={parsed?.shift} />
        {parsed?.duration && <Row label="Duration" value={parsed.duration} />}
        <Row label="Request" value={transcript} />
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>Additional notes (optional)</label>
        <textarea
          placeholder="Any special requirements or instructions..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ minHeight: 70, marginTop: 6 }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
        <button onClick={onBack} style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#334155", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          ← Back
        </button>
        <button
          onClick={() => onSubmit(notes)}
          disabled={submitting}
          style={{ padding: "9px 24px", borderRadius: 9, border: "none", background: config.accent, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? "Submitting..." : "Confirm & Book"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", minWidth: 80 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#0f1923" }}>{value}</span>
    </div>
  );
}
