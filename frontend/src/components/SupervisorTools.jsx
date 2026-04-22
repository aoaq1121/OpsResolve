import { useState } from "react";
import { db, collection, addDoc } from "../firebase";

export default function SupervisorTools() {
  const [note, setNote] = useState("");

  const sendBroadcast = async (type) => {
    if (!note && type === 'broadcast') return;
    
    await addDoc(collection(db, "announcements"), {
      content: type === 'meeting' ? "Emergency Meeting Scheduled: Check Calendar" : note,
      type: type, 
      sender: "Supervisor",
      timestamp: new Date()
    });
    setNote("");
    alert("Sent to cloud!");
  };

  return (
    <div style={{ 
      padding: '1.5rem', 
      background: '#f8fafc', 
      borderRadius: '12px', 
      border: '2px dashed #cbd5e1',
      marginTop: '20px' 
    }}>
      <h3 style={{ color: '#1e293b', marginTop: 0 }}>🛡️ Supervisor Command Center</h3>
      <p style={{ fontSize: '14px', color: '#64748b' }}>Broadcast to Manager & Data Entry</p>
      
      <input 
        type="text" 
        placeholder="Type announcement..." 
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
      />
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => sendBroadcast('broadcast')} style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          📢 Notify All
        </button>
        <button onClick={() => sendBroadcast('meeting')} style={{ flex: 1, background: '#8b5cf6', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          📅 Schedule Meeting
        </button>
      </div>
    </div>
  );
}