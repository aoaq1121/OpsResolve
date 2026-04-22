import { useEffect, useState } from "react";
import { db, collection, onSnapshot, query, orderBy, limit } from "../firebase";

export function GlobalAlertBanner() {
  const [latestAlert, setLatestAlert] = useState(null);

  useEffect(() => {
    // This connects to the "announcements" collection in Firebase
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"), limit(1));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setLatestAlert(snapshot.docs[0].data());
      }
    });
    
    return () => unsubscribe();
  }, []);

  if (!latestAlert) return null;

  const isMeeting = latestAlert.type === 'meeting';

  return (
    <div style={{
      background: isMeeting ? '#8b5cf6' : '#3b82f6', // Purple for meeting, Blue for info
      color: 'white',
      padding: '12px',
      textAlign: 'center',
      fontWeight: 'bold',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999, // Make sure it's on top of everything
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
    }}>
      <span>{isMeeting ? '📅' : '📢'}</span>
      <span>{latestAlert.content}</span>
      <button 
        onClick={() => setLatestAlert(null)} 
        style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '20px', fontSize: '18px' }}
      >
        ✕
      </button>
    </div>
  );
}