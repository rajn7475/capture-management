const ANTHROPIC_KEY = process.env.REACT_APP_ANTHROPIC_KEY

export function buildSystemPrompt(opp) {
  return `You are a senior federal business development strategist and capture manager helping a government contractor win federal contracts. You have deep expertise in USDA, federal procurement, 8(a) programs, STARS III, MAS schedules, GSA vehicles, proposal writing, and BD strategy.

You are currently working on the following opportunity:

OPPORTUNITY DETAILS:
- Title: ${opp.title}
- Agency: ${opp.agency || 'Not specified'}
- Contract Number: ${opp.contract_number || 'Not specified'}
- Vehicle: ${opp.vehicle || 'Not specified'}
- Value: ${opp.value ? '$' + Number(opp.value).toLocaleString() : 'Not specified'}
- Expiry: ${opp.expiry || 'Not specified'}
- Stage: ${opp.stage}
- Priority: ${opp.priority}
- Incumbent: ${opp.incumbent || 'None'}
- Capture Strategy: ${opp.strategy || 'Not yet defined'}

KEY CONTACTS:
${opp.contacts && opp.contacts.length > 0
  ? opp.contacts.map(c => `- ${c.name} (${c.role}): ${c.email}`).join('\n')
  : '- No contacts added yet'}

Your role is to help the BD team with:
1. Capture strategy and win themes
2. Drafting professional emails to Contracting Officers and program offices
3. Analyzing contract/PWS documents
4. Generating specific action items
5. Competitive intelligence on the incumbent
6. Proposal outlines and section drafts

Always be specific, practical, and tailored to the exact opportunity above. Never give generic advice. Reference actual contract details, agency context, and procurement specifics in your responses. When drafting emails, use the actual contact names and email addresses provided. Keep responses focused and actionable.`
}

export const QUICK_PROMPTS = [
  {
    id: 'strategy',
    label: '🎯 Win Strategy',
    icon: '🎯',
    prompt: 'Analyze this opportunity and give me a detailed win strategy. What are our top 3 win themes, key discriminators, and what should we be doing right now to position ourselves to win?'
  },
  {
    id: 'email',
    label: '✉️ Draft CO Email',
    icon: '✉️',
    prompt: 'Draft a professional introductory email to the Contracting Officer for this opportunity. The goal is to introduce our company, reference our relevant past performance, and request a brief capability briefing or industry day meeting. Keep it concise and compelling.'
  },
  {
    id: 'actions',
    label: '✅ Generate Actions',
    icon: '✅',
    prompt: 'Based on the current stage and details of this opportunity, generate a specific list of 6-8 actionable capture steps I should take over the next 30-60 days. Format each as a clear, executable action with a suggested due date.'
  },
  {
    id: 'intel',
    label: '🔍 Incumbent Intel',
    icon: '🔍',
    prompt: 'Analyze what we know about the incumbent on this opportunity. What are their likely strengths, vulnerabilities, and how should we position against them? What intelligence should we be gathering about them?'
  },
  {
    id: 'proposal',
    label: '📄 Proposal Outline',
    icon: '📄',
    prompt: 'Create a detailed proposal outline for this opportunity. Include recommended sections, key themes to address in each section, and specific win themes we should weave throughout. Tailor it to the agency and scope of work.'
  },
  {
    id: 'pws',
    label: '📋 Analyze PWS',
    icon: '📋',
    prompt: 'Help me analyze the scope of work for this opportunity. Based on what you know, what are the key technical requirements, staffing implications, likely evaluation criteria, and any risks or opportunities I should be aware of?'
  }
]

export async function sendMessage(messages, systemPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-client-side-allow-unsafe': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    })
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'API error')
  }

  const data = await response.json()
  return data.content[0].text
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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-client-side-allow-unsafe': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        ...messages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: contentWithFile }
      ]
    })
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'API error')
  }

  const data = await response.json()
  return data.content[0].text
}
