// ── Quick Prompts ─────────────────────────────────────────────────────────────
export const QUICK_PROMPTS = [
  { id: 'strategy', label: '🎯 Win Strategy', icon: '🎯',
    prompt: 'Analyze this opportunity and give me a detailed win strategy. Use Ark\'s capabilities, past performance, and certifications to identify our top 3 win themes and key discriminators. What should we be doing right now to position ourselves to win?' },
  { id: 'fit', label: '📊 Fit Analysis', icon: '📊',
    prompt: 'Analyze how well Ark\'s capabilities and past performance align with this opportunity. Give me a fit score (1-10) with reasoning, identify any gaps, and recommend whether we should pursue, team, or pass.' },
  { id: 'email', label: '✉️ Draft CO Email', icon: '✉️',
    prompt: 'Draft a professional introductory email to the Contracting Officer for this opportunity. Reference Ark\'s relevant past performance and capabilities. Request a brief capability briefing. Keep it concise and compelling.' },
  { id: 'actions', label: '✅ Generate Actions', icon: '✅',
    prompt: 'Based on the current stage and details of this opportunity, generate a specific list of 6-8 actionable capture steps for the next 30-60 days. Format each as a clear, executable action with a suggested due date.' },
  { id: 'teaming', label: '🤝 Teaming Analysis', icon: '🤝',
    prompt: 'Based on Ark\'s capabilities and this opportunity\'s requirements, identify any gaps where we need teaming partners. Review our known partners and recommend the best teaming strategy. If we have partners that fill the gaps, name them specifically.' },
  { id: 'intel', label: '🔍 Incumbent Intel', icon: '🔍',
    prompt: 'Analyze what we know about the incumbent on this opportunity. What are their likely strengths, vulnerabilities, and how should Ark position against them? What intelligence should we be gathering?' },
  { id: 'proposal', label: '📄 Proposal Outline', icon: '📄',
    prompt: 'Create a detailed proposal outline for this opportunity tailored to Ark\'s capabilities. Include recommended sections, key themes, and specific win themes to weave throughout.' },
  { id: 'pws', label: '📋 Analyze PWS', icon: '📋',
    prompt: 'Help me analyze the scope of work for this opportunity. What are the key technical requirements, staffing implications, likely evaluation criteria, and how does Ark\'s profile align?' }
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
No company documents have been uploaded yet. Ask the admin to upload capability statement, past performance, and partner documents in Company Settings.
`

  return `You are a senior federal business development strategist and capture manager working exclusively for Ark, a government IT contractor. You have deep expertise in USDA, federal procurement, 8(a) programs, STARS III, MAS schedules, GSA vehicles, proposal writing, and BD strategy.

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
- Always analyze opportunities in the context of Ark's specific capabilities, past performance, and certifications
- When recommending teaming, reference specific partners from Ark's partner list when they fill capability gaps
- Be specific, practical, and tailored — never give generic advice
- Reference actual contract details, agency context, and procurement specifics
- When drafting emails, use the actual contact names and email addresses provided
- Always consider Ark's competitive positioning vs the incumbent`
}

// ── API Calls (via Vercel serverless proxy) ───────────────────────────────────
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
