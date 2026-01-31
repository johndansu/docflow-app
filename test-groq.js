// Test Groq API directly
const testGroq = async () => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_GROQ_API_KEY_HERE',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'user', content: 'Say "Hello from Groq!"' }
      ],
      max_tokens: 50,
    }),
  })

  const result = await response.json()
  console.log('Test result:', result)
}

testGroq()
