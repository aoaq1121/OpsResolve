import { useState, useEffect } from "react";
import { db, collection, onSnapshot, updateDoc, doc } from "../firebase";
import SupervisorTools from "./SupervisorTools";

export default function ActiveConflicts({ role }) {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Track which record is currently being overridden and what the new text is
  const [overridingId, setOverridingId] = useState(null);
  const [customSolution, setCustomSolution] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "conflicts"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setConflicts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAccept = async (id) => {
    await updateDoc(doc(db, "conflicts", id), { 
      status: "resolved",
      resolutionType: "AI_ACCEPTED" 
    });
  };

  const handleConfirmOverride = async (id) => {
    if (!customSolution.trim()) return alert("Please enter the override solution.");
    
    await updateDoc(doc(db, "conflicts", id), { 
      status: "overridden",
      resolutionType: "MANUAL_OVERRIDE",
      finalSolution: customSolution, // This saves your typed text
      resolvedBy: "Manager"
    });
    
    // Reset the UI state
    setOverridingId(null);
    setCustomSolution("");
  };

  if (loading) return <div>Loading Live Conflicts...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Manager Review Board</h2>

      <div style={{ display: 'grid', gap: '15px' }}>
        {conflicts.map(c => (
          <div key={c.id} style={{ background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3>{c.title}</h3>
            <p>{c.description}</p>
            <p>Status: <strong>{c.status}</strong></p>
            {c.finalSolution && <p style={{ color: '#059669' }}><strong>Final Solution:</strong> {c.finalSolution}</p>}
            
            {/* --- MANAGER ONLY ACTIONS --- */}
            {role === 'manager' && c.status === "pending" && (
              <div style={{ marginTop: '10px' }}>
                {overridingId === c.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <textarea 
                      placeholder="Type your manual solution here..."
                      value={customSolution}
                      onChange={(e) => setCustomSolution(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #3b82f6' }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleConfirmOverride(c.id)} style={{ background: '#059669', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px' }}>Confirm Override</button>
                      <button onClick={() => setOverridingId(null)} style={{ background: '#94a3b8', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleAccept(c.id)} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px' }}>Accept AI</button>
                    <button onClick={() => { setOverridingId(c.id); setCustomSolution(""); }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px' }}>Manual Override</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {role === 'supervisor' && <SupervisorTools role={role} />}
    </div>
  );
}