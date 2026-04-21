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