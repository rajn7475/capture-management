import React, { useState, useEffect, useCallback } from 'react'
import { signOut, getProfile, getOpportunities, upsertOpportunity, deleteOpportunity, getActions, upsertAction, deleteAction, getNote, upsertNote } from '../lib/supabase'
import OppCard from '../components/OppCard'
import OppModal from '../components/OppModal'
import MorningBrief from '../components/MorningBrief'
import ContactsView from '../components/ContactsView'

export default function Dashboard({ session }) {
  const [view, setView] = useState('brief')
  const [opps, setOpps] = useState([])
  const [actions, setActions] = useState([])
  const [notes, setNotes] = useState({}) // { oppId: content }
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editOpp, setEditOpp] = useState(null)
  const user = session.user

  const load = useCallback(async () => {
    setLoading(true)
    const [oppsRes, actionsRes, profileRes] = await Promise.all([
      getOpportunities(),
      getActions(user.id),
      getProfile(user.id)
    ])
    if (oppsRes.data) setOpps(oppsRes.data)
    if (actionsRes.data) setActions(actionsRes.data)
    if (profileRes.data) setProfile(profileRes.data)
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().slice(0, 10)
  const weekEnd = (() => { const d = new Date(today); d.setDate(d.getDate() + (7 - d.getDay())); return d.toISOString().slice(0, 10) })()
  const isAdmin = profile?.role === 'admin'

  function fmtVal(v) {
    const n = Number(v) || 0
    if (n >= 1e6) return '$' + (Math.round(n / 1e5) / 10) + 'M'
    if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K'
    return '$' + n
  }

  // ── Opp handlers ──────────────────────────────────────────────────────────
  async function handleSaveOpp(opp) {
    const { data, error } = await upsertOpportunity(opp)
    if (!error && data) {
      setOpps(prev => opp.id ? prev.map(o => o.id === opp.id ? data : o) : [data, ...prev])
    }
    setShowModal(false); setEditOpp(null)
  }

  async function handleDeleteOpp(id) {
    if (!window.confirm('Delete this opportunity? This cannot be undone.')) return
    await deleteOpportunity(id)
    setOpps(prev => prev.filter(o => o.id !== id))
  }

  async function handleStageChange(id, stage) {
    await upsertOpportunity({ id, stage })
    setOpps(prev => prev.map(o => o.id === id ? { ...o, stage } : o))
  }

  // ── Action handlers ───────────────────────────────────────────────────────
  async function handleAddAction(oppId, text, dueDate) {
    const { data } = await upsertAction({ user_id: user.id, opportunity_id: oppId, text, due_date: dueDate || null, done: false })
    if (data) setActions(prev => [...prev, data])
  }

  async function handleToggleAction(actionId) {
    const action = actions.find(a => a.id === actionId)
    if (!action) return
    const { data } = await upsertAction({ ...action, done: !action.done })
    if (data) setActions(prev => prev.map(a => a.id === actionId ? data : a))
  }

  async function handleDeleteAction(actionId) {
    await deleteAction(actionId)
    setActions(prev => prev.filter(a => a.id !== actionId))
  }

  // ── Note handlers ─────────────────────────────────────────────────────────
  async function handleLoadNote(oppId) {
    if (notes[oppId] !== undefined) return
    const { data } = await getNote(user.id, oppId)
    setNotes(prev => ({ ...prev, [oppId]: data?.content || '' }))
  }

  async function handleSaveNote(oppId, content) {
    await upsertNote(user.id, oppId, content)
    setNotes(prev => ({ ...prev, [oppId]: content }))
  }

  // ── AI-generated actions ──────────────────────────────────────────────────
  async function handleAddGeneratedActions(oppId, items) {
    const newActions = []
    for (const item of items) {
      const { data } = await upsertAction({ user_id: user.id, opportunity_id: oppId, text: item.text, due_date: item.due_date || null, done: false })
      if (data) newActions.push(data)
    }
    setActions(prev => [...prev, ...newActions])
  }

  const userName = profile?.full_name || user.email.split('@')[0]
  const userInitials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const totalVal = opps.reduce((s, o) => s + (Number(o.value) || 0), 0)
  const openActions = actions.filter(a => !a.done).length
  const weekActions = actions.filter(a => !a.done && a.due_date && a.due_date <= weekEnd).length

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /><p>Loading pipeline…</p></div>

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-lockup">
            <span className="logo-diamond">◆</span>
            <span className="logo-text">Capture</span>
          </div>
          <span className="logo-sub">Federal BD Pipeline</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-label">Workspace</div>
            <button className={`nav-item ${view === 'brief' ? 'active' : ''}`} onClick={() => setView('brief')}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" /><path d="M8 5v3.5l2 1.5" strokeLinecap="round" /></svg>
              Morning Brief
            </button>
            <button className={`nav-item ${view === 'pipeline' ? 'active' : ''}`} onClick={() => setView('pipeline')}>
              <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="3" width="14" height="2" rx="1" opacity=".3" /><rect x="1" y="7" width="10" height="2" rx="1" opacity=".6" /><rect x="1" y="11" width="6" height="2" rx="1" /></svg>
              Pipeline
              <span className="nav-count">{opps.length}</span>
            </button>
          </div>
          <div className="nav-section">
            <div className="nav-label">Views</div>
            <button className={`nav-item ${view === 'contacts' ? 'active' : ''}`} onClick={() => setView('contacts')}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="3" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" /></svg>
              Contacts
            </button>
          </div>
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{userInitials}</div>
          <div className="user-info">
            <div className="user-name">{userName}</div>
            <div className="user-role">{isAdmin ? 'Admin' : 'Member'}</div>
          </div>
          <button className="signout-btn" title="Sign out" onClick={() => signOut()}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </aside>

      <main className="main">
        {view === 'brief' && (
          <MorningBrief opps={opps} actions={actions} today={today} weekEnd={weekEnd}
            userName={userName} fmtVal={fmtVal}
            onToggleAction={handleToggleAction}
            onGoToPipeline={() => setView('pipeline')} />
        )}

        {view === 'pipeline' && (
          <>
            <div className="page-header">
              <div>
                <h1 className="page-title">Opportunity Pipeline</h1>
                <p className="page-sub">{opps.length} opportunities · {fmtVal(totalVal)} total value</p>
              </div>
              {isAdmin && (
                <button className="btn primary" onClick={() => { setEditOpp(null); setShowModal(true) }}>+ Add Opportunity</button>
              )}
            </div>

            <div className="stats-row">
              {[
                { label: 'Opportunities', val: opps.length, sub: 'in pipeline' },
                { label: 'Pipeline Value', val: fmtVal(totalVal), sub: 'total estimated' },
                { label: 'My Open Actions', val: openActions, sub: `${weekActions} due this week` },
                { label: 'Expiring Soon', val: opps.filter(o => { const n = o.expiry ? Math.ceil((new Date(o.expiry) - new Date(today)) / 864e5) : 999; return n >= 0 && n <= 90 }).length, sub: 'within 90 days' }
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-lbl">{s.label}</div>
                  <div className="stat-val">{s.val}</div>
                  <div className="stat-sub">{s.sub}</div>
                </div>
              ))}
            </div>

            {opps.length === 0 ? (
              <div className="empty-state">
                <p>No opportunities yet.</p>
                {isAdmin && <button className="btn primary" onClick={() => setShowModal(true)}>Add your first opportunity</button>}
                {!isAdmin && <p className="empty-sub">Your admin will add opportunities for the team.</p>}
              </div>
            ) : (
              opps.map(opp => (
                <OppCard key={opp.id} opp={opp} userId={user.id}
                  myActions={actions.filter(a => a.opportunity_id === opp.id)}
                  noteContent={notes[opp.id]}
                  today={today} weekEnd={weekEnd} isAdmin={isAdmin} fmtVal={fmtVal}
                  onEdit={() => { setEditOpp(opp); setShowModal(true) }}
                  onDelete={() => handleDeleteOpp(opp.id)}
                  onStageChange={stage => handleStageChange(opp.id, stage)}
                  onAddAction={(text, due) => handleAddAction(opp.id, text, due)}
                  onToggleAction={handleToggleAction}
                  onDeleteAction={handleDeleteAction}
                  onLoadNote={() => handleLoadNote(opp.id)}
                  onSaveNote={content => handleSaveNote(opp.id, content)}
                  onAddGeneratedActions={items => handleAddGeneratedActions(opp.id, items)}
                />
              ))
            )}
          </>
        )}

        {view === 'contacts' && <ContactsView opps={opps} />}
      </main>

      {showModal && (
        <OppModal opp={editOpp} onSave={handleSaveOpp} onClose={() => { setShowModal(false); setEditOpp(null) }} />
      )}
    </div>
  )
}
