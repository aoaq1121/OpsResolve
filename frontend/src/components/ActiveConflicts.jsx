import { useState, useEffect, useMemo } from "react";
import { db, collection, onSnapshot, updateDoc, doc, addDoc } from "../firebase";

export default function ActiveConflicts({ role }) {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States for Search, Filter, Override, and Detail Modal
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [overridingId, setOverridingId] = useState(null);
  const [customSolution, setCustomSolution] = useState("");
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [modalOverrideText, setModalOverrideText] = useState("");
  const [supervisorNote, setSupervisorNote] = useState("");

  // 1. Live Firebase Listener
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "conflicts"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setConflicts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Logic for Search & Filtering
  const filteredConflicts = useMemo(() => {
    return conflicts
      .filter(c => filterPriority === "All" || c.priority === filterPriority)
      .filter(c => 
        c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [conflicts, searchTerm, filterPriority]);

  const openCount = conflicts.filter(c => c.status === "pending").length;

  // 3. Firebase Update Functions
  const handleAccept = async (id) => {
    await updateDoc(doc(db, "conflicts", id), { 
      status: "resolved",
      resolutionType: "AI_ACCEPTED" 
    });
    if (selectedConflict?.id === id) setSelectedConflict(null);
  };

  const handleConfirmOverride = async (id, solution) => {
    if (!solution.trim()) return alert("Please enter the override solution.");
    await updateDoc(doc(db, "conflicts", id), { 
      status: "overridden",
      finalSolution: solution,
      resolvedBy: "Manager"
    });
    if (selectedConflict?.id === id) setSelectedConflict(null);
    setOverridingId(null);
    setCustomSolution("");
    setModalOverrideText("");
  };

  const openConflict = (conflict) => {
    setSelectedConflict(conflict);
    setModalOverrideText("");
  };

  const closeConflict = () => {
    setSelectedConflict(null);
    setModalOverrideText("");
    setSupervisorNote("");
  };

  const handleNotifyAll = async () => {
    if (!supervisorNote.trim()) return alert("Please enter a message to notify everyone.");
    await addDoc(collection(db, "announcements"), {
      content: supervisorNote,
      type: "broadcast",
      sender: "Supervisor",
      timestamp: new Date()
    });
    setSupervisorNote("");
    alert("Notification sent.");
    closeConflict();
  };

  const handleScheduleMeeting = async () => {
    await addDoc(collection(db, "announcements"), {
      content: "Emergency meeting scheduled for the conflict: " + (selectedConflict?.title || "N/A"),
      type: "meeting",
      sender: "Supervisor",
      timestamp: new Date()
    });
    setSupervisorNote("");
    alert("Meeting scheduled.");
    closeConflict();
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Live Ops Board...</div>;

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Active Conflicts</h1>
        <span style={{ background: '#fee2e2', color: '#ef4444', padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>
          {openCount} open
        </span>
      </div>

      {/* VIEW-ONLY BANNER (Visible to Data Entry) */}
      {role === 'data_entry' && (
        <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', color: '#1e40af', padding: '12px 16px', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
          <span style={{ fontSize: '18px' }}>ⓘ</span>
          View only — conflict coordination requires Supervisor or Manager access.
        </div>
      )}

      {/* SEARCH AND PRIORITY FILTERS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input 
            type="text" 
            placeholder="Search by title, reason or department..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
          />
          <span style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }}>🔍</span>
        </div>
        
        <div style={{ display: 'flex', gap: '5px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          {["All", "High", "Medium", "Low"].map(p => (
            <button 
              key={p}
              onClick={() => setFilterPriority(p)}
              style={{ 
                padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
                background: filterPriority === p ? '#1e293b' : 'transparent',
                color: filterPriority === p ? 'white' : '#64748b'
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* LIST OF CONFLICT CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredConflicts.map(c => (
          <div key={c.id} onClick={() => openConflict(c)} style={{ 
            cursor: 'pointer',
            background: 'white', borderRadius: '14px', padding: '28px', border: '1px solid #e2e8f0',
            borderLeft: `6px solid ${c.priority === 'High' ? '#ef4444' : c.priority === 'Medium' ? '#f59e0b' : '#3b82f6'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'all 0.2s ease'
          }}>
            
            {/* Top Row: Priority Badge and Title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
              <span style={{ 
                fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', padding: '4px 12px', borderRadius: '6px', whiteSpace: 'nowrap',
                background: c.priority === 'High' ? '#fee2e2' : c.priority === 'Medium' ? '#fef3c7' : '#dbeafe',
                color: c.priority === 'High' ? '#b91c1c' : c.priority === 'Medium' ? '#b45309' : '#1e40af'
              }}>
                {c.priority || 'Medium'}
              </span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{c.title}</h3>
            </div>

            {/* Record Tags Line with Dashes */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
               <span style={{ background: '#f1f5f9', color: '#64748b', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>REC-001</span>
               <span style={{ color: '#cbd5e1', fontSize: '14px' }}>—</span>
               <span style={{ background: '#f1f5f9', color: '#64748b', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>REC-002</span>
               <span style={{ color: '#cbd5e1', fontSize: '14px' }}>—</span>
               <span style={{ background: '#f1f5f9', color: '#64748b', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>CON-001</span>
            </div>

            {/* Department Labels */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
               <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: '600' }}>Production</span>
               <span style={{ background: '#f3e8ff', color: '#6b21a8', padding: '6px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: '600' }}>Maintenance</span>
            </div>

            <p style={{ color: '#475569', fontSize: '15px', margin: '0 0 24px 0', lineHeight: '1.6' }}>{c.description}</p>

            {/* STATUS AND TIMESTAMP ROW */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.status === 'pending' ? '#ef4444' : '#22c55e' }}></div>
                 <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>{c.status === 'pending' ? 'Awaiting coordination' : 'Resolved'}</span>
               </div>
               <span style={{ fontSize: '13px', color: '#94a3b8' }}>2h ago</span>
            </div>

            {/* AI CONFIDENCE BAR */}
            <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ width: '87%', height: '100%', background: '#22c55e', borderRadius: '12px' }}></div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: '500', color: '#94a3b8' }}>AI confidence 87%</div>

            {/* MANAGER ACTIONS */}
            {role === 'manager' && c.status === "pending" && (
              <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                {overridingId === c.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <textarea 
                      placeholder="Type the manual override solution..."
                      value={customSolution}
                      onChange={(e) => setCustomSolution(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #3b82f6', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleConfirmOverride(c.id, customSolution)} style={{ background: '#059669', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Confirm Override</button>
                      <button onClick={() => setOverridingId(null)} style={{ background: '#94a3b8', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={(e) => { e.stopPropagation(); handleAccept(c.id); }} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Accept AI Decision</button>
                    <button onClick={(e) => { e.stopPropagation(); setOverridingId(c.id); setCustomSolution(""); }} style={{ background: 'white', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Manual Override</button>
                  </div>
                )}
              </div>
            )}
            
            {/* DISPLAY FINAL SOLUTION IF RESOLVED */}
            {c.finalSolution && (
              <div style={{ marginTop: '15px', background: '#f0fdf4', border: '1.5px solid #86efac', padding: '12px', borderRadius: '8px' }}>
                <strong style={{ color: '#166534', fontSize: '13px' }}>MANAGER RESOLUTION:</strong>
                <p style={{ margin: '5px 0 0 0', color: '#166534', fontSize: '14px' }}>{c.finalSolution}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedConflict && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 50,
          }}
          onClick={closeConflict}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 560,
              background: 'white',
              borderRadius: 18,
              padding: '24px',
              boxShadow: '0 25px 60px rgba(15, 23, 42, 0.18)',
              position: 'relative',
            }}
          >
            <button
              onClick={closeConflict}
              style={{
                position: 'absolute',
                right: 16,
                top: 16,
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              ×
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '18px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                  {selectedConflict.title || 'Conflict details'}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  {selectedConflict.description || 'No description available.'}
                </div>
              </div>
              <span style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: selectedConflict.priority === 'High' ? '#fee2e2' : '#f1f5f9', color: selectedConflict.priority === 'High' ? '#b91c1c' : '#334155' }}>
                {selectedConflict.priority || 'Medium'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Status</div>
                <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 700 }}>{selectedConflict.status || 'pending'}</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Resolved By</div>
                <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 700 }}>{selectedConflict.resolvedBy || 'AI / Pending'}</div>
              </div>
            </div>

            <div style={{ background: '#f1f5f9', borderRadius: '14px', padding: '16px', border: '1px solid #dbeafe', marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '10px' }}>Conflict details</div>
              <div style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
                <p style={{ margin: 0 }}><strong>Title:</strong> {selectedConflict.title || '—'}</p>
                <p style={{ margin: '8px 0 0' }}><strong>Description:</strong> {selectedConflict.description || '—'}</p>
                {selectedConflict.finalSolution && (
                  <p style={{ margin: '8px 0 0' }}><strong>Final solution:</strong> {selectedConflict.finalSolution}</p>
                )}
                {selectedConflict.resolutionType && (
                  <p style={{ margin: '8px 0 0' }}><strong>Resolution type:</strong> {selectedConflict.resolutionType}</p>
                )}
              </div>
            </div>

            {role === 'manager' && selectedConflict.status === 'pending' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={() => handleAccept(selectedConflict.id)} style={{ width: '100%', background: '#22c55e', color: 'white', border: 'none', padding: '12px 16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Accept AI Decision
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea
                    value={modalOverrideText}
                    onChange={(e) => setModalOverrideText(e.target.value)}
                    placeholder="Type a manual override solution..."
                    style={{ width: '100%', minHeight: '110px', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                  />
                  <button onClick={() => handleConfirmOverride(selectedConflict.id, modalOverrideText)} style={{ width: '100%', background: '#3b82f6', color: 'white', border: 'none', padding: '12px 16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Confirm Override
                  </button>
                </div>
              </div>
            )}

            {role === 'supervisor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  value={supervisorNote}
                  onChange={(e) => setSupervisorNote(e.target.value)}
                  placeholder="Enter a message for your team..."
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                />
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={handleNotifyAll} style={{ flex: 1, minWidth: '160px', background: '#3b82f6', color: 'white', border: 'none', padding: '12px 16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                    📢 Notify All
                  </button>
                  <button onClick={handleScheduleMeeting} style={{ flex: 1, minWidth: '160px', background: '#8b5cf6', color: 'white', border: 'none', padding: '12px 16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                    📅 Schedule Meeting
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}