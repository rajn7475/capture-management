export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, system, mode } = req.body

  if (!messages || !system) {
    return res.status(400).json({ error: 'Missing messages or system prompt' })
  }

  const finalSystem = mode === 'extract_actions'
    ? system + `\n\nIMPORTANT: Your response must be valid JSON only — no prose, no markdown.
Return an array of action objects:
[{ "text": "action description", "due_date": "YYYY-MM-DD" }, ...]
Generate 5-8 specific, executable capture actions for this opportunity.
Set realistic due dates starting from today. Return ONLY the JSON array.`
    : system

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.REACT_APP_ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: finalSystem,
        messages
      })
    })

    if (!response.ok) {
      const err = await response.json()
      return res.status(response.status).json({ error: err.error?.message || 'Anthropic API error' })
    }

    const data = await response.json()
    const content = data.content[0].text

    if (mode === 'extract_actions') {
      try {
        const clean = content.replace(/```json|```/g, '').trim()
        const actions = JSON.parse(clean)
        return res.status(200).json({ content, actions })
      } catch {
        return res.status(200).json({ content, actions: [] })
      }
    }

    return res.status(200).json({ content })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
