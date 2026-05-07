import React, { useState, useEffect, useRef } from 'react'
import { getChatHistory, saveChatMessage, clearChatHistory } from '../lib/supabase'
import { sendMessage, sendMessageWithFile, buildSystemPrompt, QUICK_PROMPTS } from '../lib/claude'

export default function ClaudeChat({ opp, userId, today, companyContext, onAddGeneratedActions }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)
  const systemPrompt = buildSystemPrompt(opp, companyContext)

  // Load chat history
  useEffect(() => {
    async function load() {
      setLoadingHistory(true)
      const { data } = await getChatHistory(userId, opp.id)
      if (data && data.length > 0) {
        setMessages(data.map(m => ({ role: m.role, content: m.content, id: m.id })))
      } else {
        // Welcome message
        setMessages([{
          role: 'assistant',
          content: `Hi! I'm your BD assistant for **${opp.title}**.\n\nI have full context on this opportunity — the agency, vehicle, incumbent, value, and your capture strategy. Use the quick prompts below to get started, or ask me anything.`,
          id: 'welcome'
        }])
      }
      setLoadingHistory(false)
    }
    load()
  }, [userId, opp.id, opp.title])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(text) {
    const msgText = text || input.trim()
    if (!msgText && !uploadedFile) return
    setInput('')
    setError('')

    const userMsg = { role: 'user', content: uploadedFile ? `[File: ${uploadedFile.name}]\n\n${msgText}` : msgText }
    const newMessages = [...messages.filter(m => m.id !== 'welcome'), userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      let reply
      if (uploadedFile) {
        reply = await sendMessageWithFile(newMessages, systemPrompt, uploadedFile.base64, uploadedFile.type)
        setUploadedFile(null)
      } else {
        reply = await sendMessage(newMessages, systemPrompt)
      }

      const assistantMsg = { role: 'assistant', content: reply }
      const finalMessages = [...newMessages, assistantMsg]
      setMessages(finalMessages)

      // Save to DB (skip welcome)
      await saveChatMessage(userId, opp.id, 'user', userMsg.content)
      await saveChatMessage(userId, opp.id, 'assistant', reply)

      // Auto-detect generated action items and offer to add them
      if (text?.includes('Generate Actions') || text?.includes('action items')) {
        const lines = reply.split('\n').filter(l => /^\d+\.|^-|^•/.test(l.trim()))
        if (lines.length > 0) {
          const parsed = lines.map(l => {
            const cleaned = l.replace(/^\d+\.|^-|^•/, '').trim()
            const dueDateMatch = cleaned.match(/(\d{4}-\d{2}-\d{2})|by (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/)
            return { text: cleaned.replace(/\(.*?\)/g, '').trim(), due_date: dueDateMatch ? null : null }
          }).filter(a => a.text.length > 10)
          if (parsed.length > 0 && onAddGeneratedActions) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `__ADD_ACTIONS__${JSON.stringify(parsed)}`,
              id: 'action-prompt-' + Date.now()
            }])
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Check your API key in settings.')
    }
    setLoading(false)
  }

  async function handleClear() {
    if (!window.confirm('Clear this chat history?')) return
    await clearChatHistory(userId, opp.id)
    setMessages([{
      role: 'assistant',
      content: `Chat cleared. I still have full context on **${opp.title}**. What would you like to work on?`,
      id: 'welcome'
    }])
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const base64 = ev.target.result.split(',')[1]
      setUploadedFile({ name: file.name, base64, type: file.type })
    }
    reader.readAsDataURL(file)
  }

  function renderMessage(msg) {
    if (msg.content.startsWith('__ADD_ACTIONS__')) {
      const items = JSON.parse(msg.content.replace('__ADD_ACTIONS__', ''))
      return (
        <div className="chat-action-prompt">
          <p>I generated {items.length} action items. Add them to your tracker?</p>
          <div className="chat-action-items">
            {items.slice(0, 5).map((item, i) => <div key={i} className="chat-action-item">• {item.text}</div>)}
          </div>
          <button className="btn primary" onClick={() => { onAddGeneratedActions(items); setMessages(prev => prev.filter(m => m !== msg)) }}>
            ✓ Add to My Actions
          </button>
        </div>
      )
    }

    // Simple markdown rendering
    const formatted = msg.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^## (.*$)/gm, '<h3>$1</h3>')
      .replace(/^\d+\. (.*$)/gm, '<div class="md-li">$1</div>')
      .replace(/^[-•] (.*$)/gm, '<div class="md-li">$1</div>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>')

    return <div className="chat-text" dangerouslySetInnerHTML={{ __html: formatted }} />
  }

  if (loadingHistory) return <div className="pane chat-loading">Loading conversation…</div>

  return (
    <div className="pane chat-pane">
      {/* Quick prompts */}
      <div className="quick-prompts">
        {QUICK_PROMPTS.map(p => (
          <button key={p.id} className="quick-prompt-btn" onClick={() => handleSend(p.prompt)} disabled={loading}>
            <span>{p.icon}</span> {p.label.replace(/^.+? /, '')}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`chat-msg ${msg.role}`}>
            <div className="chat-bubble">
              {renderMessage(msg)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg assistant">
            <div className="chat-bubble chat-typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        {error && <div className="chat-error">{error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* File attachment indicator */}
      {uploadedFile && (
        <div className="file-indicator">
          📎 {uploadedFile.name}
          <button onClick={() => setUploadedFile(null)}>×</button>
        </div>
      )}

      {/* Input */}
      <div className="chat-input-row">
        <button className="chat-attach-btn" title="Attach PWS / document" onClick={() => fileRef.current.click()}>
          📎
        </button>
        <input type="file" ref={fileRef} style={{ display: 'none' }} accept=".pdf,image/*" onChange={handleFileUpload} />
        <textarea className="chat-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything about this opportunity…"
          rows={1} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} />
        <button className="chat-send-btn" onClick={() => handleSend()} disabled={loading || (!input.trim() && !uploadedFile)}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1 8l13-6-4 6 4 6z" /></svg>
        </button>
        <button className="chat-clear-btn" title="Clear history" onClick={handleClear}>↺</button>
      </div>
    </div>
  )
}
