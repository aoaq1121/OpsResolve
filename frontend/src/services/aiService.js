export async function submitRecord(data) {
  const response = await fetch("http://localhost:5000/api/submit-record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to submit record");
  return await response.json();
}

export async function aiExtract(prompt, file = null, department = null) {
  // Fetch past records for this department to help impute missing fields
  let pastRecords = [];
  if (department) {
    try {
      const res = await fetch(`http://localhost:3001/api/records`);
      const data = await res.json();
      const all = Array.isArray(data) ? data : data.data || [];
      pastRecords = all
        .filter(r => r.department === department || r.category === department)
        .slice(-10); // last 10 records from this department
        console.log("Past records found:", pastRecords.length, "for dept:", department);
    } catch { pastRecords = []; }
  }

  const body = { prompt, department, pastRecords };
  if (file) body.file = { base64: file.base64, mediaType: file.mediaType };
  console.log("Sending to backend:", { promptLength: prompt.length, hasFile: !!file, mediaType: file?.mediaType });

  const response = await fetch("http://localhost:5000/api/ai-extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error("AI extract failed");
  return await response.json();
}
