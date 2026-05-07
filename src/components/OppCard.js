import React, { useState } from 'react'
import ClaudeChat from './ClaudeChat'

const STAGES = ['Identified','Qualifying','Capture','Bid/No-Bid','Proposing','Submitted','Won','Lost']
const STAGE_COLOR = { Identified:'gray',Qualifying:'blue',Capture:'purple','Bid/No-Bid':'amber',Proposing:'amber',Submitted:'blue',Won:'green',Lost:'red' }

export default function OppCard({ opp, userId, myActions, noteContent, today, weekEnd, isAdmin, fmtVal,
  companyContext, teamMembers, currentUserName,
  onEdit, onDelete, onStageChange, onAddAction, onToggleAction, onDeleteAction,
  onLoadNote, onSaveNote, onAddGeneratedActions }) {

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('overview')
  const [noteVal, setNoteVal] = useState(null)
  const [newAction, setNewAction] = useState('')
  const [newDue, setNewDue] = useState(today)
  const [newAssignee, setNewAssignee] = useState(userId) // default: assign to self

  function daysTo(d) { return d ? Math.ceil((new Date(d) - new Date(today)) / 864e5) : null }

  function expiryBadge() {
    const n = daysTo(opp.expiry)
    if (n === null) return null
    if (n < 0) return { text: 'Expired', cls: 'b-red' }
    if (n <= 30) return { text: `Expires in ${n}d`, cls: 'b-red' }
    if (n <= 90) return { text: `Expires in ${n}d`, cls: 'b-amber' }
    return { text: `Exp ${new Date(opp.expiry).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}`, cls: 'b-gray' }
  }

  const openActions = myActions.filter(a => !a.done).length
  const weekActs = myActions.filter(a => !a.done && a.due_date && a.due_date <= weekEnd).length
  const progress = myActions.length ? Math.round(myActions.filter(a => a.done).length / myActions.length * 100) : 0
  const exp = expiryBadge()
  const sc = STAGE_COLOR[opp.stage] || 'gray'
  const priorityCls = opp.priority === 'HIGH' ? 'b-red' : opp.priority === 'MEDIUM' ? 'b-amber' : 'b-gray'

  function handleTabClick(t) {
    setTab(t)
    if (t === 'notes' && noteContent === undefined) onLoadNote()
    if (t === 'notes' && noteVal === null && noteContent !== undefined) setNoteVal(noteContent || '')
  }

  React.useEffect(() => {
    if (tab === 'notes' && noteVal === null && noteContent !== undefined) setNoteVal(noteContent)
  }, [noteContent, tab, noteVal])

  function handleAddAction() {
    if (!newAction.trim()) return
    // Find assignee name
    const assignee = teamMembers?.find(m => m.id === newAssignee)
    const assigneeName = assignee?.full_name || currentUserName || 'Me'
    onAddAction(newAction.trim(), newDue, newAssignee, assigneeName)
    setNewAction('')
    setNewDue(today)
    setNewAssignee(userId)
  }

  function memberInitials(name) {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div className={`opp-card ${opp.priority?.toLowerCase()}`}>
      <div className="card-top" onClick={() => setOpen(o => !o)}>
        <span className={`chevron ${open ? 'open' : ''}`}>▶</span>
        <div className="card-meta">
          <div className="card-title">{opp.title}</div>
          <div className="card-agency">
            {opp.agency} &nbsp;·&nbsp; Incumbent: <strong>{opp.incumbent || 'None'}</strong>
          </div>
          <div className="prog-wrap">
            <div className="prog-track"><div className="prog-fill" style={{ width: progress + '%' }} /></div>
            <span className="prog-txt">{progress}% capture</span>
          </div>
        </div>
        <div className="card-right">
          <span className="card-val">{fmtVal(opp.value)}</span>
          <span className={`badge b-${sc}`}>{opp.stage}</span>
          <span className={`badge ${priorityCls}`}>{opp.priority}</span>
          {exp && <span className={`badge ${exp.cls}`}>{exp.text}</span>}
        </div>
      </div>

      {open && (
        <div className="card-body">
          <div className="tabs">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'actions', label: `Actions${weekActs > 0 ? ` (${weekActs} this week)` : openActions > 0 ? ` (${openActions})` : ''}` },
              { id: 'notes', label: 'My Notes' },
              { id: 'claude', label: '✦ Ask Claude' }
            ].map(t => (
              <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''} ${t.id === 'claude' ? 'tab-claude' : ''}`}
                onClick={() => handleTabClick(t.id)}>{t.label}</button>
            ))}
          </div>

          {/* Overview */}
          {tab === 'overview' && (
            <div className="pane">
              <div className="info-grid">
                {[
                  { l: 'Contract #', v: opp.contract_number },
                  { l: 'Agency', v: opp.agency },
                  { l: 'Vehicle', v: opp.vehicle },
                  { l: 'Value', v: fmtVal(opp.value) },
                  { l: 'Expiry', v: opp.expiry || '—' },
                  { l: 'Incumbent', v: opp.incumbent || 'None' }
                ].map(f => (
                  <div key={f.l} className="info-field">
                    <div className="info-lbl">{f.l}</div>
                    <div className="info-val">{f.v || '—'}</div>
                  </div>
                ))}
              </div>
              <div className="stage-row">
                <span className="info-lbl">Stage:</span>
                <select className="stage-sel" value={opp.stage} onChange={e => onStageChange(e.target.value)}>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              {opp.strategy && (
                <div className="strategy-box">
                  <div className="strategy-lbl">Capture Strategy</div>
                  <div className="strategy-text">{opp.strategy}</div>
                </div>
              )}
              {opp.contacts?.length > 0 && (
                <div className="contacts-section">
                  <div className="strategy-lbl">Key Contacts</div>
                  {opp.contacts.map((c, i) => (
                    <div key={i} className="contact-row">
                      <div className="contact-avatar">{c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
                      <div className="contact-info">
                        <div className="contact-name">{c.name}</div>
                        <div className="contact-role">{c.role}</div>
                      </div>
                      <a className="contact-email" href={`mailto:${c.email}`}>{c.email}</a>
                    </div>
                  ))}
                </div>
              )}
              {isAdmin && (
                <div className="card-actions-row">
                  <button className="btn" onClick={onEdit}>✎ Edit</button>
                  <button className="btn danger" onClick={onDelete}>✕ Delete</button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {tab === 'actions' && (
            <div className="pane">
              {myActions.length === 0 && (
                <p className="empty-hint">No actions yet. Add one below or use <strong>✦ Ask Claude</strong> to generate them automatically.</p>
              )}
              <div className="actions-list">
                {myActions.map(a => {
                  const late = a.due_date && daysTo(a.due_date) < 0 && !a.done
                  return (
                    <div key={a.id} className={`action-item ${a.done ? 'done' : ''} ${late ? 'overdue' : ''}`}>
                      <input type="checkbox" className="action-chk" checked={a.done} onChange={() => onToggleAction(a.id)} />
                      <div className="action-body">
                        <div className="action-text">{a.text}</div>
                        <div className="action-meta-row">
                          {a.due_date && (
                            <div className={`action-due ${late ? 'late' : ''}`}>
                              📅 {late ? 'Overdue – ' : ''}{new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                          {a.assigned_name && (
                            <div className="action-assignee">
                              <div className="action-assignee-avatar">{memberInitials(a.assigned_name)}</div>
                              {a.assigned_name}
                            </div>
                          )}
                        </div>
                      </div>
                      <button className="action-del" onClick={() => onDeleteAction(a.id)}>×</button>
                    </div>
                  )
                })}
              </div>

              {/* Add action form */}
              <div className="add-action-form-full">
                <input type="text" className="add-action-input" value={newAction}
                  onChange={e => setNewAction(e.target.value)}
                  placeholder="Add action item…"
                  onKeyDown={e => e.key === 'Enter' && handleAddAction()} />
                <div className="add-action-meta">
                  <div className="add-action-field">
                    <label>Due Date</label>
                    <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} />
                  </div>
                  <div className="add-action-field">
                    <label>Assigned To</label>
                    <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)}>
                      {teamMembers?.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.full_name || m.email || 'Unknown'}{m.id === userId ? ' (me)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn primary" onClick={handleAddAction}>Add</button>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {tab === 'notes' && (
            <div className="pane">
              <textarea className="notes-ta" value={noteVal ?? ''} placeholder="Your personal notes for this opportunity…"
                onChange={e => setNoteVal(e.target.value)} />
              <div className="save-row">
                <button className="btn primary" onClick={() => onSaveNote(noteVal)}>Save Notes</button>
              </div>
            </div>
          )}

          {/* Claude */}
          {tab === 'claude' && (
            <ClaudeChat opp={opp} userId={userId} today={today}
              companyContext={companyContext}
              onAddGeneratedActions={onAddGeneratedActions} />
          )}
        </div>
      )}
    </div>
  )
}
