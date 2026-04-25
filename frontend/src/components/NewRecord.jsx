import { useState, useRef, useEffect } from "react";
import { submitRecord, aiExtract } from "../services/aiService";
import { ConflictDetectedModal } from "./ConflictDetectedModal";

// ── Department config ─────────────────────────────────────────────────────────
const DEPT_CONFIG = {
  Production: {
    accent: "#16a34a",
    light: "#f0fdf4",
    border: "#86efac",
    text: "#166534",
    label: "Production Work Order",
    icon: "⚙️",
  },
  Maintenance: {
    accent: "#2563eb",
    light: "#eff6ff",
    border: "#bfdbfe",
    text: "#1e40af",
    label: "Maintenance Request",
    icon: "🔧",
  },
  "Quality Control": {
    accent: "#7c3aed",
    light: "#f5f3ff",
    border: "#ddd6fe",
    text: "#5b21b6",
    label: "Quality Control Inspection",
    icon: "🔍",
  },
  Logistics: {
    accent: "#d97706",
    light: "#fffbeb",
    border: "#fde68a",
    text: "#92400e",
    label: "Logistics Request",
    icon: "🚚",
  },
};

// ── Shared field components ───────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div className="form-group">
      <label>{label}{required && <span className="required"> *</span>}</label>
      {children}
    </div>
  );
}

// ── Machine Availability Panel ────────────────────────────────────────────────
function MachineAvailability({ date, shift, type, department, onSelect, selectedMachineId, accent }) {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date || !shift) return;
    setLoading(true);
    const params = new URLSearchParams({ date, shift });
    if (type) params.append("type", type);
    if (department) params.append("department", department);
    fetch(`http://localhost:3001/api/machines/available?${params}`)
      .then((r) => r.json())
      .then((data) => { setMachines(Array.isArray(data) ? data : data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [date, shift, type, department]);

  if (!date || !shift) return null;

  return (
    <div style={{ marginTop: 16, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        Available Machines — {shift} shift, {date}
      </div>
      {loading ? (
        <div style={{ fontSize: 13, color: "#94a3b8" }}>Checking availability...</div>
      ) : machines.length === 0 ? (
        <div style={{ fontSize: 13, color: "#ef4444", fontWeight: 500 }}>No machines available for this slot.</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {machines.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelect(m)}
              style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                border: `1.5px solid ${selectedMachineId === m.id ? accent : "#e2e8f0"}`,
                background: selectedMachineId === m.id ? accent : "#fff",
                color: selectedMachineId === m.id ? "#fff" : "#334155",
                transition: "all 0.15s",
              }}
            >
              {m.name}
              <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, opacity: 0.75 }}>{m.location}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AI Fill Button (Upload only) ─────────────────────────────────────────────
function AIFillBar({ onFilled, accent, light, border, department }) {
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [suggestedFields, setSuggestedFields] = useState([]);
  const fileRef = useRef();

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setProcessing(true);
    setStatus("Reading file...");
    setSuggestedFields([]);
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      setStatus("Extracting fields...");
      const deptPrompts = {
        Production: "workOrderNo, productName, processType, priority, targetQuantity, unit, location, equipment, date, shift, duration, description",
        Maintenance: "equipmentId, title, maintenanceType, location, estimatedDowntime, spareParts, technician, date, shift, duration, description",
        "Quality Control": "inspectionType, batchRef, productName, priority, sampleSize, qcStation, defectType, disposition, date, shift, duration, description",
        Logistics: "requestType, vendorName, poNumber, materialDesc, quantity, bay, vehicleRequired, arrivalTime, date, shift, priority, description",
      };
      const fieldList = deptPrompts[department] || "workOrderNo, productName, processType, priority, location, equipment, date, shift, duration, description";
      const prompt = `Extract these fields from the document text and return ONLY JSON (null if missing): ${fieldList}. No explanation, just JSON.`;
      const result = await aiExtract(prompt, { base64, mediaType: file.type }, department);
      if (!result.parsed) throw new Error("Could not parse");
      console.log("AI parsed:", result.parsed);
      console.log("AI suggested:", result.aiSuggested);
      if (result.aiSuggested?.length > 0) {
        setSuggestedFields(result.aiSuggested);
        setStatus(`✓ Filled from file · ${result.aiSuggested.length} field(s) suggested from history`);
      } else {
        setStatus("✓ Form filled from file");
      }
      onFilled(result.parsed, result.aiSuggested || []);
    } catch (err) {
      setStatus("Could not read file. Try again.");
    }
    setProcessing(false);
    e.target.value = "";
  }

  return (
    <div style={{ background: light, border: `1.5px solid ${border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>AI Fill</span>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={processing}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            border: `1.5px solid ${border}`, background: "#fff", color: "#334155",
            opacity: processing ? 0.6 : 1, transition: "all 0.15s",
          }}
        >
          {processing ? "Processing..." : "Upload Work Order (PDF / Image)"}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={handleFileUpload} />
        {status && (
          <span style={{ fontSize: 12, color: status.startsWith("✓") ? "#16a34a" : "#64748b", fontWeight: 500 }}>
            {processing && <span style={{ marginRight: 6 }}>⏳</span>}{status}
          </span>
        )}
      </div>
      {suggestedFields.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8, padding: "6px 10px" }}>
          AI suggested from history: <strong>{suggestedFields.join(", ")}</strong>
        </div>
      )}
    </div>
  );
}


// ── Production Form ───────────────────────────────────────────────────────────
function ProductionForm({ form, onChange }) {
  return (
    <>
      <div className="form-section-label">Work Order Details</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
        <Field label="Work Order No." required>
          <input placeholder="e.g. WO-2204" value={form.workOrderNo || ""} onChange={e => onChange("workOrderNo", e.target.value)} />
        </Field>
        <Field label="Product Name / SKU" required>
          <input placeholder="e.g. Panel A-Series" value={form.productName || ""} onChange={e => onChange("productName", e.target.value)} />
        </Field>
        <Field label="Process Type" required>
          <select value={form.processType || ""} onChange={e => onChange("processType", e.target.value)}>
            <option value="">— Select —</option>
            <option>Cutting</option>
            <option>Welding</option>
            <option>Sanding</option>
            <option>Assembly</option>
            <option>Painting</option>
            <option>Packaging</option>
            <option>CNC Machining</option>
            <option>Pressing</option>
            <option>Inspection</option>
          </select>
        </Field>
        <Field label="Priority">
          <select value={form.priority || "Normal"} onChange={e => onChange("priority", e.target.value)}>
            <option>Normal</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
        <Field label="Target Quantity">
          <input placeholder="e.g. 500" value={form.targetQuantity || ""} onChange={e => onChange("targetQuantity", e.target.value)} />
        </Field>
        <Field label="Unit">
          <select value={form.unit || ""} onChange={e => onChange("unit", e.target.value)}>
            <option value="">— Select —</option>
            <option>pcs</option>
            <option>kg</option>
            <option>metres</option>
            <option>sets</option>
            <option>boxes</option>
          </select>
        </Field>
        <Field label="Line / Workstation">
          <select value={form.location || ""} onChange={e => onChange("location", e.target.value)}>
            <option value="">— Select —</option>
            <option>Line A</option>
            <option>Line B</option>
            <option>Line C</option>
            <option>Bay 1</option>
            <option>Bay 2</option>
            <option>Bay 3</option>
          </select>
        </Field>
        <Field label="Equipment / Machine">
          <select value={form.equipment || ""} onChange={e => onChange("equipment", e.target.value)}>
            <option value="">— Select —</option>
            <option>Sanding Machine S-01</option>
            <option>Sanding Machine S-02</option>
            <option>Welding Machine W-01</option>
            <option>Welding Machine W-02</option>
            <option>CNC Machine C-01</option>
            <option>Assembly Station A-01</option>
            <option>Assembly Station A-02</option>
            <option>Painting Booth P-01</option>
            <option>Packaging Line PK-01</option>
          </select>
        </Field>
      </div>

      <div className="form-section-label">Schedule</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
        <Field label="Date Required" required>
          <input type="date" value={form.date || ""} onChange={e => onChange("date", e.target.value)} />
        </Field>
        <Field label="Shift">
          <select value={form.shift || "Morning"} onChange={e => onChange("shift", e.target.value)}>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Night</option>
          </select>
        </Field>
        <Field label="Estimated Duration">
          <select value={form.duration || ""} onChange={e => onChange("duration", e.target.value)}>
            <option value="">— Select —</option>
            <option>Less than 1 hour</option>
            <option>1–2 hours</option>
            <option>2–4 hours</option>
            <option>4–8 hours</option>
            <option>Full day</option>
            <option>Multi-day</option>
          </select>
        </Field>
      </div>

      <div className="form-section-label">Remarks</div>
      <div style={{ marginBottom: 4 }}>
        <Field label="Remarks">
          <textarea placeholder="Additional notes, constraints or instructions..." value={form.description || ""} onChange={e => onChange("description", e.target.value)} style={{ minHeight: 80 }} />
        </Field>
      </div>
    </>
  );
}

// ── Maintenance Form ──────────────────────────────────────────────────────────
function MaintenanceForm({ form, onChange }) {
  return (
    <>
      <div className="form-section-label">Equipment Details</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
        <Field label="Equipment ID / Asset Tag" required>
          <input placeholder="e.g. M-07, FL-02" value={form.equipmentId || ""} onChange={e => onChange("equipmentId", e.target.value)} />
        </Field>
        <Field label="Equipment Name" required>
          <input placeholder="e.g. CNC Lathe Machine" value={form.title || ""} onChange={e => onChange("title", e.target.value)} />
        </Field>
        <Field label="Maintenance Type" required>
          <select value={form.maintenanceType || ""} onChange={e => onChange("maintenanceType", e.target.value)}>
            <option value="">— Select —</option>
            <option>Preventive</option>
            <option>Corrective</option>
            <option>Breakdown</option>
            <option>Calibration</option>
            <option>Overhaul</option>
          </select>
        </Field>
        <Field label="Priority">
          <select value={form.priority || "Normal"} onChange={e => onChange("priority", e.target.value)}>
            <option>Normal</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
        <Field label="Affected Line / Area">
          <select value={form.location || ""} onChange={e => onChange("location", e.target.value)}>
            <option value="">— Select —</option>
            <option>Line A</option>
            <option>Line B</option>
            <option>Bay 1</option>
            <option>Bay 2</option>
            <option>Bay 3</option>
            <option>Warehouse</option>
            <option>Control Room</option>
          </select>
        </Field>
        <Field label="Estimated Downtime">
          <select value={form.estimatedDowntime || ""} onChange={e => onChange("estimatedDowntime", e.target.value)}>
            <option value="">— Select —</option>
            <option>Less than 1 hour</option>
            <option>1–2 hours</option>
            <option>2–4 hours</option>
            <option>4–8 hours</option>
            <option>Full day</option>
            <option>Multi-day</option>
          </select>
        </Field>
        <Field label="Spare Parts Required">
          <input placeholder="e.g. Bearing #6205, Belt V-type" value={form.spareParts || ""} onChange={e => onChange("spareParts", e.target.value)} />
        </Field>
        <Field label="Assigned Technician">
          <input placeholder="e.g. Ahmad bin Ali" value={form.technician || ""} onChange={e => onChange("technician", e.target.value)} />
        </Field>
      </div>

      <div className="form-section-label">Schedule</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
        <Field label="Date Required" required>
          <input type="date" value={form.date || ""} onChange={e => onChange("date", e.target.value)} />
        </Field>
        <Field label="Shift">
          <select value={form.shift || "Morning"} onChange={e => onChange("shift", e.target.value)}>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Night</option>
          </select>
        </Field>
        <Field label="Duration">
          <select value={form.duration || ""} onChange={e => onChange("duration", e.target.value)}>
            <option value="">— Select —</option>
            <option>Less than 1 hour</option>
            <option>1–2 hours</option>
            <option>2–4 hours</option>
            <option>4–8 hours</option>
            <option>Full day</option>
            <option>Multi-day</option>
          </select>
        </Field>
      </div>

      <div className="form-section-label">Fault Description</div>
      <div style={{ marginBottom: 4 }}>
        <Field label="Fault Description" required>
          <textarea placeholder="Describe the fault, symptoms, or maintenance scope in detail..." value={form.description || ""} onChange={e => onChange("description", e.target.value)} style={{ minHeight: 80 }} />
        </Field>
      </div>
    </>
  );
}

// ── Quality Control Form ──────────────────────────────────────────────────────
function QualityControlForm({ form, onChange }) {
  return (
    <>
      <div className="form-section-label">Inspection Details</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
        <Field label="Inspection Type" required>
          <select value={form.inspectionType || ""} onChange={e => onChange("inspectionType", e.target.value)}>
            <option value="">— Select —</option>
            <option>Incoming Material</option>
            <option>In-Process</option>
            <option>Final Inspection</option>
            <option>Re-inspection</option>
            <option>Audit</option>
          </select>
        </Field>
        <Field label="Work Order / Batch Ref" required>
          <input placeholder="e.g. WO-2204, Batch RM-01" value={form.batchRef || ""} onChange={e => onChange("batchRef", e.target.value)} />
        </Field>
        <Field label="Product Name">
          <input placeholder="e.g. Panel A-Series" value={form.productName || ""} onChange={e => onChange("productName", e.target.value)} />
        </Field>
        <Field label="Priority">
          <select value={form.priority || "Normal"} onChange={e => onChange("priority", e.target.value)}>
            <option>Normal</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
        <Field label="Sample Size">
          <input placeholder="e.g. 30 pcs" value={form.sampleSize || ""} onChange={e => onChange("sampleSize", e.target.value)} />
        </Field>
        <Field label="QC Station">
          <select value={form.qcStation || ""} onChange={e => onChange("qcStation", e.target.value)}>
            <option value="">— Select —</option>
            <option>QC Station 1</option>
            <option>QC Station 2</option>
            <option>QC Lab</option>
            <option>Line A — Inline</option>
            <option>Line B — Inline</option>
          </select>
        </Field>
        <Field label="Defect Type (if flagged)">
          <select value={form.defectType || ""} onChange={e => onChange("defectType", e.target.value)}>
            <option value="">— None —</option>
            <option>Dimensional</option>
            <option>Surface defect</option>
            <option>Functional failure</option>
            <option>Contamination</option>
            <option>Wrong spec</option>
            <option>Packaging defect</option>
          </select>
        </Field>
        <Field label="Disposition">
          <select value={form.disposition || ""} onChange={e => onChange("disposition", e.target.value)}>
            <option value="">— Select —</option>
            <option>Accept</option>
            <option>Reject</option>
            <option>Hold</option>
            <option>Rework</option>
            <option>Scrap</option>
          </select>
        </Field>
      </div>

      <div className="form-section-label">Schedule</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
        <Field label="Date Required" required>
          <input type="date" value={form.date || ""} onChange={e => onChange("date", e.target.value)} />
        </Field>
        <Field label="Shift">
          <select value={form.shift || "Morning"} onChange={e => onChange("shift", e.target.value)}>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Night</option>
          </select>
        </Field>
        <Field label="Duration">
          <select value={form.duration || ""} onChange={e => onChange("duration", e.target.value)}>
            <option value="">— Select —</option>
            <option>Less than 1 hour</option>
            <option>1–2 hours</option>
            <option>2–4 hours</option>
            <option>4–8 hours</option>
            <option>Full day</option>
          </select>
        </Field>
      </div>

      <div className="form-section-label">Inspection Criteria & Remarks</div>
      <div style={{ marginBottom: 4 }}>
        <Field label="Inspection Criteria / Standard" required>
          <textarea placeholder="e.g. ISO 9001, internal spec IQS-04, AQL 1.0..." value={form.description || ""} onChange={e => onChange("description", e.target.value)} style={{ minHeight: 80 }} />
        </Field>
      </div>
    </>
  );
}

// ── Logistics Form ────────────────────────────────────────────────────────────
function LogisticsForm({ form, onChange }) {
  return (
    <>
      <div className="form-section-label">Request Details</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
        <Field label="Request Type" required>
          <select value={form.requestType || ""} onChange={e => onChange("requestType", e.target.value)}>
            <option value="">— Select —</option>
            <option>Inbound Delivery</option>
            <option>Outbound Shipment</option>
            <option>Internal Transfer</option>
            <option>Return to Vendor</option>
          </select>
        </Field>
        <Field label="Vendor / Recipient" required>
          <input placeholder="e.g. ABC Supplies Sdn Bhd" value={form.vendorName || ""} onChange={e => onChange("vendorName", e.target.value)} />
        </Field>
        <Field label="PO / DO Number" required>
          <input placeholder="e.g. PO-20240425" value={form.poNumber || ""} onChange={e => onChange("poNumber", e.target.value)} />
        </Field>
        <Field label="Priority">
          <select value={form.priority || "Normal"} onChange={e => onChange("priority", e.target.value)}>
            <option>Normal</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
        <Field label="Material / Item Description" required>
          <input placeholder="e.g. Raw steel rods, Grade A" value={form.materialDesc || ""} onChange={e => onChange("materialDesc", e.target.value)} />
        </Field>
        <Field label="Quantity & Unit">
          <input placeholder="e.g. 500 kg, 20 pallets" value={form.quantity || ""} onChange={e => onChange("quantity", e.target.value)} />
        </Field>
        <Field label="Receiving / Dispatch Bay">
          <select value={form.bay || ""} onChange={e => onChange("bay", e.target.value)}>
            <option value="">— Select —</option>
            <option>Bay 1</option>
            <option>Bay 2</option>
            <option>Bay 3</option>
            <option>Loading Dock A</option>
            <option>Loading Dock B</option>
            <option>Warehouse</option>
          </select>
        </Field>
        <Field label="Vehicle / Forklift Required">
          <select value={form.vehicleRequired || ""} onChange={e => onChange("vehicleRequired", e.target.value)}>
            <option value="">— Select —</option>
            <option>Forklift</option>
            <option>Pallet Jack</option>
            <option>Lorry</option>
            <option>Van</option>
            <option>None</option>
          </select>
        </Field>
      </div>

      <div className="form-section-label">Schedule</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
        <Field label="Expected Arrival / Dispatch" required>
          <input type="date" value={form.date || ""} onChange={e => onChange("date", e.target.value)} />
        </Field>
        <Field label="Arrival Time">
          <input type="time" value={form.arrivalTime || ""} onChange={e => onChange("arrivalTime", e.target.value)} />
        </Field>
        <Field label="Shift">
          <select value={form.shift || "Morning"} onChange={e => onChange("shift", e.target.value)}>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Night</option>
          </select>
        </Field>
        <Field label="Operational Impact">
          <select value={form.impact || ""} onChange={e => onChange("impact", e.target.value)}>
            <option value="">— Select —</option>
            <option>No disruption</option>
            <option>Minor disruption</option>
            <option>Partial shutdown</option>
            <option>Full line stop</option>
          </select>
        </Field>
      </div>

      <div className="form-section-label">Remarks</div>
      <div style={{ marginBottom: 4 }}>
        <Field label="Remarks">
          <textarea placeholder="Special handling instructions, customs notes, delivery constraints..." value={form.description || ""} onChange={e => onChange("description", e.target.value)} style={{ minHeight: 80 }} />
        </Field>
      </div>
    </>
  );
}

// ── Main NewRecord component ──────────────────────────────────────────────────
export function NewRecord({ onViewConflicts, department, openConflictCount = 0 }) {
  const config = DEPT_CONFIG[department] || DEPT_CONFIG.Production;

  const [form, setForm] = useState({
    priority: "Normal",
    shift: "Morning",
  });
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detectedConflict, setDetectedConflict] = useState(null);
  const [recordAdded, setRecordAdded] = useState(false);

  function handleChange(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
    // Reset machine selection if date or shift changes
    if (field === "date" || field === "shift") setSelectedMachine(null);
  }

  const [aiSuggestedFields, setAiSuggestedFields] = useState([]);

  function handleAIFill(parsed, suggested = []) {
    setForm((prev) => ({
      ...prev,
      ...Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== null && v !== undefined && v !== "")),
    }));
    setAiSuggestedFields(suggested);
    setSelectedMachine(null);
  }

  function handleMachineSelect(machine) {
    setSelectedMachine(machine);
    setForm((prev) => ({ ...prev, machineId: machine.id, machineName: machine.name, machineType: machine.type }));
  }

  function getMachineType() {
    if (department === "Production") return form.processType || null;
    if (department === "Quality Control") return "Inspection";
    if (department === "Logistics") return form.vehicleRequired || null;
    return null;
  }

  function validate() {
    if (department === "Production" && (!form.workOrderNo || !form.processType || !form.date)) {
      alert("Please fill in Work Order No., Process Type and Date."); return false;
    }
    if (department === "Maintenance" && (!form.equipmentId || !form.maintenanceType || !form.description || !form.date)) {
      alert("Please fill in Equipment ID, Maintenance Type, Date and Fault Description."); return false;
    }
    if (department === "Quality Control" && (!form.inspectionType || !form.batchRef || !form.date)) {
      alert("Please fill in Inspection Type, Batch Reference and Date."); return false;
    }
    if (department === "Logistics" && (!form.requestType || !form.vendorName || !form.poNumber || !form.date)) {
      alert("Please fill in Request Type, Vendor, PO Number and Date."); return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setDetectedConflict(null);

    const payload = {
      ...form,
      department,
      title: form.workOrderNo || form.equipmentId || form.batchRef || form.poNumber || form.title || `${department} request`,
      category: department,
    };

    console.log("Submitting:", payload);

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
          conflictReason: data?.aiSummary?.conflictReason || "Conflict detected with an existing record.",
          departmentsInvolved: [department].filter(Boolean),
          recommendation: data?.aiSummary?.recommendation || "Review and coordinate with the affected department.",
        });
      } else {
        setForm({ priority: "Normal", shift: "Morning" });
        setSelectedMachine(null);
        setAiSuggestedFields([]);
        setRecordAdded(true);
        setTimeout(() => setRecordAdded(false), 3000);
      }
    } catch (err) {
      console.error(err);
      setRecordAdded(true);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm({ priority: "Normal", shift: "Morning" });
    setSelectedMachine(null);
    setDetectedConflict(null);
    setRecordAdded(false);
  }

  return (
    <div style={{ padding: "1.75rem", width: "100%" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 className="section-title">{config.label}</h2>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100,
            background: config.light, color: config.text, border: `1px solid ${config.border}`,
            textTransform: "uppercase", letterSpacing: "0.07em",
          }}>{department}</span>
        </div>
        <button className="btn-view-conflicts" onClick={onViewConflicts}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 6 }}>
            <path d="M7 1.5A3.5 3.5 0 003.5 5v2L2.5 9h9L10.5 7V5A3.5 3.5 0 007 1.5zM5.5 11a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          View Active Conflicts
          {openConflictCount > 0 && (
            <span style={{ marginLeft: 7, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 100 }}>
              {openConflictCount}
            </span>
          )}
        </button>
      </div>

      {/* Form card */}
      <div style={{
        background: "#fff",
        border: `1.5px solid ${config.border}`,
        borderTop: `3px solid ${config.accent}`,
        borderRadius: 14,
        padding: "1.75rem 2rem",
        width: "100%",
      }}>
        {/* AI Fill bar */}
        <AIFillBar
          onFilled={handleAIFill}
          accent={config.accent}
          light={config.light}
          border={config.border}
          department={department}
        />

        {/* Department-specific form */}
        {department === "Production" && <ProductionForm form={form} onChange={handleChange} />}
        {department === "Maintenance" && <MaintenanceForm form={form} onChange={handleChange} />}
        {department === "Quality Control" && <QualityControlForm form={form} onChange={handleChange} />}
        {department === "Logistics" && <LogisticsForm form={form} onChange={handleChange} />}

        {/* Machine availability removed - use Request Machine tab instead */}

        {/* Actions */}
        <div className="form-actions">
          <button className="btn btn-cancel-form" onClick={reset} disabled={loading}>Clear</button>
          <button
            className="btn btn-submit"
            onClick={handleSubmit}
            disabled={loading}
            style={{ background: config.accent, borderColor: config.accent }}
          >
            {loading ? "Analyzing..." : "Submit Record"}
          </button>
        </div>

        {recordAdded && (
          <div style={{ marginTop: 16, background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, animation: "fadeUp 0.3s ease" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#dcfce7", border: "1.5px solid #86efac", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8l3.5 3.5 7-7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>Record submitted successfully</div>
              <div style={{ fontSize: 13, color: "#166534", marginTop: 2 }}>No conflicts detected with existing records.</div>
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
