export async function callGLM(agentType, data) {

  const promptMap = {
    inputAgent: "Extract structured data from input...",
    conflictAgent: "Detect resource conflict...",
    impactAgent: "Analyze operational impact...",
    decisionAgent: "Generate resolution strategy..."
  };

  const response = await fetch("ZAI_GLM_ENDPOINT", {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_KEY",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "glm-4",
      messages: [
        {
          role: "system",
          content: promptMap[agentType]
        },
        {
          role: "user",
          content: JSON.stringify(data)
        }
      ]
    })
  });

  const result = await response.json();

  return JSON.parse(result.choices[0].message.content);
}