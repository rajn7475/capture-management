import React from 'react'

export default function MorningBrief({ opps, actions, today, weekEnd, userName, fmtVal, onToggleAction, onGoToPipeline }) {
  const overdue = actions.filter(a => !a.done && a.due_date && a.due_date < today)
  const dueToday = actions.filter(a => !a.done && a.due_date === today)
  const dueWeek = actions.filter(a => !a.done && a.due_date && a.due_date > today && a.due_date <= weekEnd)
  const expiring = opps.filter(o => { const n = o.expiry ? Math.ceil((new Date(o.expiry) - new Date(today)) / 864e5) : 999; return n >= 0 && n <= 90 })

  function getOppTitle(oppId) { return opps.find(o => o.id === oppId)?.title || 'Unknown opportunity' }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <div className="brief-header">
        <div className="brief-greeting">{greeting}, {userName.split(' ')[0]} ☀️</div>
        <div className="brief-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
        <div className="brief-stats">
          <span>{opps.length} opportunities</span>
          <span>·</span>
          <span>{fmtVal(opps.reduce((s, o) => s + (Number(o.value) || 0), 0))} pipeline</span>
          <span>·</span>
          <span>{actions.filter(a => !a.done).length} open actions</span>
        </div>
      </div>

      <div className="brief-grid">
        {/* Overdue */}
        <div className="brief-section">
          <div className="brief-section-hd">
            <span className="brief-dot red" />
            Overdue <span className="brief-count">{overdue.length}</span>
          </div>
          {overdue.length === 0
            ? <div className="brief-empty">No overdue actions ✓</div>
            : overdue.map(a => (
              <div key={a.id} className="brief-item">
                <div className="brief-item-body">
                  <div className="brief-item-text">{a.text}</div>
                  <div className="brief-item-sub">{getOppTitle(a.opportunity_id)} · Was due {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
                <button className="btn-done" onClick={() => onToggleAction(a.id)}>Done</button>
              </div>
            ))}
        </div>

        {/* Due today */}
        <div className="brief-section">
          <div className="brief-section-hd">
            <span className="brief-dot amber" />
            Due Today <span className="brief-count">{dueToday.length}</span>
          </div>
          {dueToday.length === 0
            ? <div className="brief-empty">Nothing due today</div>
            : dueToday.map(a => (
              <div key={a.id} className="brief-item">
                <div className="brief-item-body">
                  <div className="brief-item-text">{a.text}</div>
                  <div className="brief-item-sub">{getOppTitle(a.opportunity_id)}</div>
                </div>
                <button className="btn-done" onClick={() => onToggleAction(a.id)}>Done</button>
              </div>
            ))}
        </div>

        {/* This week */}
        <div className="brief-section">
          <div className="brief-section-hd">
            <span className="brief-dot green" />
            This Week <span className="brief-count">{dueWeek.length}</span>
          </div>
          {dueWeek.length === 0
            ? <div className="brief-empty">Nothing else this week</div>
            : dueWeek.map(a => (
              <div key={a.id} className="brief-item">
                <div className="brief-item-body">
                  <div className="brief-item-text">{a.text}</div>
                  <div className="brief-item-sub">{getOppTitle(a.opportunity_id)} · Due {new Date(a.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                </div>
              </div>
            ))}
        </div>

        {/* Expiring soon */}
        <div className="brief-section">
          <div className="brief-section-hd">
            <span className="brief-dot blue" />
            Expiring Soon <span className="brief-count">{expiring.length}</span>
          </div>
          {expiring.length === 0
            ? <div className="brief-empty">No contracts expiring within 90 days</div>
            : expiring.map(o => {
              const n = Math.ceil((new Date(o.expiry) - new Date(today)) / 864e5)
              return (
                <div key={o.id} className="brief-item" onClick={onGoToPipeline} style={{ cursor: 'pointer' }}>
                  <div className="brief-item-body">
                    <div className="brief-item-text">{o.title}</div>
                    <div className="brief-item-sub">{o.agency} · {fmtVal(o.value)} · Expires in {n} days</div>
                  </div>
                  <span className={`badge ${n <= 30 ? 'b-red' : 'b-amber'}`}>{n}d</span>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
