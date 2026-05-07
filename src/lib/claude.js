// ── Quick Prompts ─────────────────────────────────────────────────────────────
export const QUICK_PROMPTS = [
  { id: 'strategy', label: '🎯 Win Strategy', icon: '🎯',
    prompt: 'Analyze this opportunity and give me a detailed win strategy. Use Ark\'s capabilities and past performance to identify our top 3 win themes and key discriminators.' },
  { id: 'fit', label: '📊 Fit Analysis', icon: '📊',
    prompt: 'Analyze how well Ark\'s capabilities and past performance align with this opportunity. Give me a fit score (1-10) with reasoning, identify gaps, and recommend pursue, team, or pass.' },
  { id: 'actions', label: '✅ Add Actions', icon: '✅',
    prompt: '__GENERATE_ACTIONS__' },
  { id: 'email', label: '✉️ Draft CO Email', icon: '✉️',
    prompt: 'Draft a professional introductory email to the Contracting Officer. Reference Ark\'s relevant past performance. Request a capability briefing. Keep it concise and compelling.' },
  { id: 'teaming', label: '🤝 Teaming', icon: '🤝',
    prompt: 'Based on Ark\'s capabilities and this opportunity\'s requirements, identify gaps and recommend the best teaming strategy. Reference specific partners from our partner list if they fill gaps.' },
  { id: 'intel', label: '🔍 Incumbent Intel', icon: '🔍',
    prompt: 'Analyze the incumbent\'s strengths and vulnerabilities. How should Ark position against them? What intelligence should we gather?' },
  { id: 'proposal', label: '📄 Proposal Outline', icon: '📄',
    prompt: 'Create a detailed proposal outline tailored to Ark\'s capabilities. Include sections, key themes, and win themes to weave throughout.' },
  { id: 'pws', label: '📋 Analyze PWS', icon: '📋',
    prompt: 'Analyze the scope of work. What are the key technical requirements, staffing implications, evaluation criteria, and how does Ark align?' }
]

// ── System Prompt Builder ─────────────────────────────────────────────────────
export function buildSystemPrompt(opp, companyContext = null) {
  const companySection = companyContext ? `
COMPANY PROFILE (ARK):
${companyContext.capability || 'No capability statement uploaded yet.'}

ARK PAST PERFORMANCE:
${companyContext.pastPerformance || 'No past performance documents uploaded yet.'}

TEAMING PARTNERS:
${companyContext.partners || 'No teaming partners added yet.'}
` : `
COMPANY PROFILE (ARK):
No company documents uploaded yet. Admin should upload capability statement, past performance, and partner docs in Company Settings.
`

  return `You are a senior federal BD strategist and capture manager working exclusively for Ark, a government IT contractor. You have deep expertise in USDA, federal procurement, 8(a) programs, STARS III, MAS schedules, GSA vehicles, proposal writing, and BD strategy.
${companySection}
CURRENT OPPORTUNITY:
- Title: ${opp.title}
- Agency: ${opp.agency || 'Not specified'}
- Contract #: ${opp.contract_number || 'Not specified'}
- Vehicle: ${opp.vehicle || 'Not specified'}
- Value: ${opp.value ? '$' + Number(opp.value).toLocaleString() : 'Not specified'}
- Expiry: ${opp.expiry || 'Not specified'}
- Stage: ${opp.stage}
- Priority: ${opp.priority}
- Incumbent: ${opp.incumbent || 'None identified'}
- Capture Strategy: ${opp.strategy || 'Not yet defined'}

KEY CONTACTS:
${opp.contacts && opp.contacts.length > 0
  ? opp.contacts.map(c => `- ${c.name} (${c.role}): ${c.email}`).join('\n')
  : '- No contacts added yet'}

INSTRUCTIONS:
- Always analyze in context of Ark's specific capabilities and past performance
- When you identify action items, present them clearly so they can be added to the Actions tab
- Be specific, practical, and tailored — never generic
- Reference actual contract details and procurement specifics
- When drafting emails use the actual contact names and emails provided`
}

// ── Auto-generate actions for a new opportunity ───────────────────────────────
export async function generateActionsForOpp(opp, companyContext = null) {
  const systemPrompt = buildSystemPrompt(opp, companyContext)
  const prompt = `Generate 6 specific capture action items for this opportunity at the "${opp.stage}" stage. Each action should be concrete and executable within the next 60 days.`

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: systemPrompt,
      mode: 'extract_actions',
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!response.ok) return []
  const data = await response.json()
  return data.actions || []
}

// ── Extract actions from any Claude response ──────────────────────────────────
export function extractActionsFromResponse(reply) {
  const actions = []
  const lines = reply.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    // Match numbered lists, bullets, checkboxes
    if (/^(\d+\.|[-•*]|\[[ x]\])\s+/.test(trimmed)) {
      const text = trimmed.replace(/^(\d+\.|[-•*]|\[[ x]\])\s+/, '').trim()
      if (text.length < 15) continue

      // Try to extract a due date from the text
      let due_date = null
      const today = new Date()

      const weekMatch = text.match(/week\s*(\d+)?|within\s*(\d+)\s*week/i)
      const dayMatch = text.match(/(\d+)\s*day/i)
      const monthMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{1,2})?/i)

      if (dayMatch) {
        const d = new Date(today)
        d.setDate(d.getDate() + parseInt(dayMatch[1]))
        due_date = d.toISOString().slice(0, 10)
      } else if (weekMatch) {
        const weeks = parseInt(weekMatch[1] || weekMatch[2] || 2)
        const d = new Date(today)
        d.setDate(d.getDate() + (weeks * 7))
        due_date = d.toISOString().slice(0, 10)
      }

      // Clean the text
      const cleanText = text
        .replace(/\(due:?.*?\)/gi, '')
        .replace(/by\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d*/gi, '')
        .replace(/within\s+\d+\s+(day|week|month)s?/gi, '')
        .trim()
        .replace(/[.:]$/, '')

      if (cleanText.length > 10) {
        actions.push({ text: cleanText, due_date })
      }
    }
  }

  return actions
}

// ── Detect if response contains actionable items ──────────────────────────────
export function responseHasActions(reply, userMessage = '') {
  const actionTriggers = [
    'add to', 'action item', 'task', 'should do', 'recommend',
    'next step', 'you should', 'i suggest', 'action plan',
    'capture step', 'to-do', 'generate action'
  ]
  const lowerReply = reply.toLowerCase()
  const lowerMsg = userMessage.toLowerCase()

  const hasListItems = /^(\d+\.|[-•*])\s+/m.test(reply)
  const hasActionLanguage = actionTriggers.some(t => lowerReply.includes(t) || lowerMsg.includes(t))

  return hasListItems && hasActionLanguage
}

// ── API Calls ─────────────────────────────────────────────────────────────────
export async function sendMessage(messages, systemPrompt) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    })
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'API error')
  }
  const data = await response.json()
  return data.content
}

export async function sendMessageWithFile(messages, systemPrompt, fileBase64, fileType) {
  const lastUserMsg = messages[messages.length - 1]
  const contentWithFile = [
    {
      type: fileType === 'application/pdf' ? 'document' : 'image',
      source: { type: 'base64', media_type: fileType, data: fileBase64 }
    },
    { type: 'text', text: lastUserMsg.content }
  ]

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: systemPrompt,
      messages: [
        ...messages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: contentWithFile }
      ]
    })
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'API error')
  }
  const data = await response.json()
  return data.content
}
