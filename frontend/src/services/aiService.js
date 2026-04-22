// services/aiService.js
export async function submitRecord(data) {
  const response = await fetch("http://localhost:5000/api/submit-record", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to submit record");
  }

  return await response.json();
}

export async function fetchConflicts() {
  const response = await fetch("http://localhost:3001/api/conflicts", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch conflicts");
  }

  return await response.json();
}

export async function createConflict(conflictData) {
  const response = await fetch("http://localhost:3001/api/conflicts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(conflictData),
  });

  if (!response.ok) {
    throw new Error("Failed to create conflict");
  }

  return await response.json();
}