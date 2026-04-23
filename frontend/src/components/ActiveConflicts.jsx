import { useState, useEffect, useMemo } from "react";
import { db, collection, onSnapshot, updateDoc, doc, addDoc } from "../firebase";
import ConflictPopup from "./ConflictPopup";

const severityOrder = { High: 0, Medium: 1, Low: 2 };

export default function ActiveConflicts({ role, department, onMoveToDecisionReview }) {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [modalOverrideText, setModalOverrideText] = useState("");
  const [supervisorNote, setSupervisorNote] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  // 1. LIVE FIREBASE CONNECTION (Your logic)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "conflicts"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        // Ensure status mapping matches UI expectations
        displayStatus: d.data().status === 'pending' ? 'Awaiting coordination' : 'Resolved'
      }));
      setConflicts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. SEARCH & FILTER LOGIC (Her logic)
  // 2. SEARCH & FILTER & GROUPING LOGIC
  const filteredConflicts = useMemo(() => {
  const groups = {};

  conflicts.forEach((record) => {
    const groupId = record.conflictId || record.location || "unassigned";
    const priority = record.priority || record.severity || "Medium";

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

  const result = Object.values(groups).map((group) => {
    const hasPending = group.statusList.includes("pending");
    const hasOverridden = group.statusList.includes("overridden");
    const hasResolved = group.statusList.includes("resolved");
    const status = hasPending ? "pending" : hasOverridden ? "overridden" : hasResolved ? "resolved" : group.statusList[0] || "pending";

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
  });

  return result
    .filter((group) => group.involvedRecords.length > 1)
    .filter((group) => showResolved || group.status === "pending")
    .filter((group) =>
      !searchTerm ||
      group.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.involvedRecords.some((r) =>
        r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
    .filter((group) => filterPriority === "All" || group.priority === filterPriority);
}, [conflicts, searchTerm, filterPriority, showResolved]);

  const openCount = conflicts.filter((c) => c.status === "pending").length;

  // 3. ACTIONS
  // In ActiveConflicts.jsx
  const handleAccept = async (groupId, supervisorData = {}) => {
    try {
      // 1. Find all specific Firestore documents that belong to this group
      const recordsToUpdate = conflicts.filter(
        (r) => (r.conflictId || r.location) === groupId
      );

      // 2. Prepare the update object
      // If it's a final resolution, we set status to resolved. 
      // Otherwise, we just save the announcement/meeting info.
      const updatePayload = {
        ...supervisorData,
        updatedAt: new Date().toISOString()
      };

      // 3. Update every document in that group in Firebase
      const promises = recordsToUpdate.map((record) =>
        updateDoc(doc(db, "conflicts", record.id), updatePayload)
      );

      await Promise.all(promises);
      console.log("Firebase Update Success:", updatePayload);
    } catch (err) {
      console.error("Firebase Update Error:", err);
      alert("Failed to save to database. Check console.");
    }
  };

  const handleConfirmOverride = async (id, solution) => {
    if (!solution.trim()) return alert("Please enter the override solution.");
    await updateDoc(doc(db, "conflicts", id), { 
      status: "overridden",
      finalSolution: solution,
      resolvedBy: "Manager"
    });
    setSelectedConflict(null);
    setModalOverrideText("");
  };

  // Updated Action inside ActiveConflicts.jsx
  const handleSupervisorAction = async (groupId, updateData) => {
    // Find all records that belong to this conflict group
    const recordsToUpdate = conflicts.filter(r => (r.conflictId || r.location) === groupId);
    
    const promises = recordsToUpdate.map(record => 
      updateDoc(doc(db, "conflicts", record.id), {
        ...updateData, // This adds announcement or meetingDate/Time
        lastActionBy: role,
        updatedAt: new Date().toISOString()
      })
    );

    await Promise.all(promises);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Live Ops Board...</div>;

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Active Conflicts</h1>
          {openCount > 0 && (
            <span style={{ background: '#fee2e2', color: '#ef4444', padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>
              {openCount} open
            </span>
          )}
        </div>
        <button
            onClick={() => setShowResolved(!showResolved)}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer", background: showResolved ? "#eff6ff" : "white" }}
          >
            {showResolved ? "Hide Resolved" : "Show All"}
        </button>
      </div>

      {role === 'data_entry' && (
        <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', color: '#1e40af', padding: '12px 16px', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
          <span>ⓘ</span> View only — coordination requires Supervisor access.
        </div>
      )}

      {/* SEARCH & FILTERS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="Search conflicts..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
        />
        <div style={{ display: 'flex', gap: '5px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          {["All", "High", "Medium", "Low"].map(p => (
            <button 
              key={p}
              onClick={() => setFilterPriority(p)}
              style={{ 
                padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                background: filterPriority === p ? '#1e293b' : 'transparent',
                color: filterPriority === p ? 'white' : '#64748b'
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* CONFLICT LIST (Fix: Width 100% for longer blocks) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        {filteredConflicts.map(c => (
          <div 
            key={c.id} 
            onClick={() => setSelectedConflict(c)} 
            style={{ 
              cursor: 'pointer', width: '100%', // THIS MAKES IT LONG
              background: 'white', borderRadius: '14px', padding: '24px', border: '1px solid #e2e8f0',
              borderLeft: `6px solid ${c.priority === 'High' ? '#ef4444' : '#3b82f6'}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              opacity: (c.status === 'resolved' || c.status === 'overridden') ? 0.6 : 1
            }}
            
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
               <span style={{ fontSize: '12px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', background: '#f1f5f9' }}>
                 {c.priority} Priority
               </span>
               <span style={{ fontSize: '12px', color: '#94a3b8' }}>ID: {c.id.slice(0,5)}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', padding: '5px 10px', borderRadius: '999px', background: c.status === 'pending' ? '#fef3c7' : c.status === 'resolved' ? '#d1fae5' : '#fee2e2', color: c.status === 'pending' ? '#b45309' : c.status === 'resolved' ? '#065f46' : '#991b1b' }}>
                {c.statusLabel}
              </span>
              {c.managerDecision && (
                <span style={{ fontSize: '12px', fontWeight: '700', padding: '5px 10px', borderRadius: '999px', background: '#e0f2fe', color: '#0369a1' }}>
                  Decision: {c.managerDecision}
                </span>
              )}
            </div>
            <h3 style={{ margin: '0 0 10px 0' }}>
                {/* Show the Location as the Case Title instead of just the first activity's title */}
                Conflict Case: {c.involvedRecords[0]?.location || "General Area"}
              </h3>

              <div style={{ fontSize: '14px', color: '#ef4444', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {c.involvedRecords.length} Activities Overlapping
              </div>

              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '10px' }}>
                {/* List the names of all clashing activities */}
                <strong>Involved:</strong> {c.involvedRecords.map(r => r.title).join(" ↔️ ")}
              </p>

              <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>
                {/* Show the first description as a preview */}
                Preview: "{c.involvedRecords[0]?.description?.substring(0, 60)}..."
              </p>

              {c.finalSolution && (
                <p style={{ color: '#1f2937', fontSize: '13px', marginBottom: '10px', background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <strong>Override reason:</strong> {c.finalSolution}
                </p>
              )}

              {/* --- START STEP B: SUPERVISOR ACTION BANNERS --- */}
      {(c.involvedRecords.some(r => r.announcement) || c.involvedRecords.some(r => r.meetingDate)) && (
        <div style={{ 
          marginTop: '16px', 
          paddingTop: '16px', 
          borderTop: '1px dashed #e2e8f0',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px' 
        }}>
          {/* Announcement Row */}
          {c.involvedRecords.some(r => r.announcement) && (
            <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', padding: '8px 12px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span>📢</span>
              <div style={{ fontSize: '13px', color: '#9a3412' }}>
                <strong>Announcement:</strong> {c.involvedRecords.find(r => r.announcement).announcement}
              </div>
            </div>
          )}

          {/* Meeting Row */}
          {c.involvedRecords.some(r => r.meetingDate) && (
            <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', padding: '8px 12px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span>📅</span>
              <div style={{ fontSize: '13px', color: '#166534' }}>
                <strong>Meeting:</strong> {c.involvedRecords.find(r => r.meetingDate).meetingDate} at {c.involvedRecords.find(r => r.meetingDate).meetingTime}
              </div>
            </div>
          )}
        </div>
      )}
      {/* --- END STEP B --- */}

    </div> // This closes the individual conflict card
  ))}
</div>
            

      {/* POPUP MODAL (Her design) */}
      {selectedConflict && (
        <ConflictPopup 
          conflict={selectedConflict} 
          role={role}
          onClose={() => setSelectedConflict(null)}
          onAccept={handleAccept}
          onDecisionComplete={onMoveToDecisionReview}
        />
      )}
    </div>
    
  );
}