import React, { useState, useEffect, useRef } from 'react'
import { getChatHistory, saveChatMessage, clearChatHistory } from '../lib/supabase'
import { sendMessage, sendMessageWithFile, buildSystemPrompt, QUICK_PROMPTS,
  extractActionsFromResponse, responseHasActions, generateActionsForOpp } from '../lib/claude'

export default function ClaudeChat({ opp, userId, today, companyContext, onAddGeneratedActions }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [pendingActions, setPendingActions] = useState(null) // actions awaiting user approval
  const [addingActions, setAddingActions] = useState(false)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)
  const systemPrompt = buildSystemPrompt(opp, companyContext)

  useEffect(() => {
    async function load() {
      setLoadingHistory(true)
      const { data } = await getChatHistory(userId, opp.id)
      if (data && data.length > 0) {
        setMessages(data.map(m => ({ role: m.role, content: m.content, id: m.id })))
      } else {
        setMessages([{
          role: 'assistant',
          content: `Hi! I'm your BD assistant for **${opp.title}**.\n\nI have full context on this opportunity. Use the quick prompts to get started, or ask me anything. I can also **add action items directly to your Actions tab** — just ask!`,
          id: 'welcome'
        }])
      }
      setLoadingHistory(false)
    }
    load()
  }, [userId, opp.id, opp.title])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingActions])

  async function handleSend(text) {
    // Special case: Generate Actions quick prompt
    if (text === '__GENERATE_ACTIONS__') {
      await handleGenerateActions()
      return
    }

    const msgText = text || input.trim()
    if (!msgText && !uploadedFile) return
    setInput('')
    setError('')
    setPendingActions(null)

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
      setMessages([...newMessages, assistantMsg])

      await saveChatMessage(userId, opp.id, 'user', userMsg.content)
      await saveChatMessage(userId, opp.id, 'assistant', reply)

      // Auto-detect actionable items in ANY response
      if (responseHasActions(reply, msgText)) {
        const extracted = extractActionsFromResponse(reply)
        if (extracted.length > 0) {
          setPendingActions(extracted)
        }
      }

      // Also catch explicit requests to add/create tasks
      const lowerMsg = msgText.toLowerCase()
      if ((lowerMsg.includes('add') || lowerMsg.includes('create') || lowerMsg.includes('generate')) &&
          (lowerMsg.includes('task') || lowerMsg.includes('action'))) {
        await handleGenerateActions(newMessages)
      }

    } catch (err) {
      setError(err.message || 'Something went wrong.')
    }
    setLoading(false)
  }

  async function handleGenerateActions(existingMessages = null) {
    setLoading(true)
    setError('')
    setPendingActions(null)

    try {
      // Show a message indicating we're generating
      const genMsg = { role: 'user', content: 'Generate specific capture action items for this opportunity and add them to my Actions tab.' }
      const msgs = existingMessages || [...messages.filter(m => m.id !== 'welcome'), genMsg]
      if (!existingMessages) setMessages(msgs)

      const actions = await generateActionsForOpp(opp, companyContext)

      if (actions.length > 0) {
        const confirmMsg = {
          role: 'assistant',
          content: `I've generated ${actions.length} capture actions for this opportunity. Review them below and click **Add to Actions** to save them to your Actions tab.`,
          id: 'gen-' + Date.now()
        }
        setMessages(prev => [...prev.filter(m => m.id !== 'welcome'), confirmMsg])
        await saveChatMessage(userId, opp.id, 'assistant', confirmMsg.content)
        setPendingActions(actions)
      } else {
        setError('Could not generate actions. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Failed to generate actions.')
    }
    setLoading(false)
  }

  async function handleAddActions() {
    if (!pendingActions || !onAddGeneratedActions) return
    setAddingActions(true)
    await onAddGeneratedActions(pendingActions)
    setPendingActions(null)
    setAddingActions(false)

    const successMsg = {
      role: 'assistant',
      content: `✅ Added ${pendingActions?.length || ''} action items to your Actions tab! Switch to the Actions tab to see them, set due dates, and track progress.`,
      id: 'success-' + Date.now()
    }
    setMessages(prev => [...prev, successMsg])
    await saveChatMessage(userId, opp.id, 'assistant', successMsg.content)
  }

  async function handleClear() {
    if (!window.confirm('Clear this chat history?')) return
    await clearChatHistory(userId, opp.id)
    setPendingActions(null)
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
    const formatted = msg.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^## (.*$)/gm, '<h3>$1</h3>')
      .replace(/^✅ (.*$)/gm, '<div class="md-check">✅ $1</div>')
      .replace(/^(\d+)\. (.*$)/gm, '<div class="md-li"><span class="md-num">$1.</span>$2</div>')
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
            <div className="chat-bubble chat-typing"><span /><span /><span /></div>
          </div>
        )}

        {/* Pending actions panel */}
        {pendingActions && pendingActions.length > 0 && (
          <div className="pending-actions-panel">
            <div className="pending-actions-header">
              <span className="pending-actions-icon">✅</span>
              <div>
                <div className="pending-actions-title">{pendingActions.length} Action Items Ready</div>
                <div className="pending-actions-sub">Review and add to your Actions tab</div>
              </div>
            </div>
            <div className="pending-actions-list">
              {pendingActions.map((a, i) => (
                <div key={i} className="pending-action-item">
                  <span className="pending-action-num">{i + 1}</span>
                  <div className="pending-action-text">{a.text}</div>
                  {a.due_date && <div className="pending-action-due">Due {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>}
                </div>
              ))}
            </div>
            <div className="pending-actions-footer">
              <button className="btn" onClick={() => setPendingActions(null)}>Dismiss</button>
              <button className="btn primary" onClick={handleAddActions} disabled={addingActions}>
                {addingActions ? 'Adding…' : `✓ Add ${pendingActions.length} Actions to Tab`}
              </button>
            </div>
          </div>
        )}

        {error && <div className="chat-error">{error}</div>}
        <div ref={bottomRef} />
      </div>

      {uploadedFile && (
        <div className="file-indicator">
          📎 {uploadedFile.name}
          <button onClick={() => setUploadedFile(null)}>×</button>
        </div>
      )}

      <div className="chat-input-row">
        <button className="chat-attach-btn" title="Attach PWS / document" onClick={() => fileRef.current.click()}>📎</button>
        <input type="file" ref={fileRef} style={{ display: 'none' }} accept=".pdf,image/*" onChange={handleFileUpload} />
        <textarea className="chat-input" value={input} onChange={e => setInput(e.target.value)}
          placeholder="Ask anything, or say 'add action items'…"
          rows={1} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} />
        <button className="chat-send-btn" onClick={() => handleSend()} disabled={loading || (!input.trim() && !uploadedFile)}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1 8l13-6-4 6 4 6z" /></svg>
        </button>
        <button className="chat-clear-btn" title="Clear history" onClick={handleClear}>↺</button>
      </div>
    </div>
  )
}
