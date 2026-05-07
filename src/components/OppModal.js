import React, { useState } from 'react'

const STAGES = ['Identified','Qualifying','Capture','Bid/No-Bid','Proposing','Submitted','Won','Lost']

export default function OppModal({ opp, onSave, onClose, companyContext }) {
  const [form, setForm] = useState({
    id: opp?.id || undefined,
    title: opp?.title || '',
    agency: opp?.agency || '',
    contract_number: opp?.contract_number || '',
    vehicle: opp?.vehicle || '',
    value: opp?.value || '',
    expiry: opp?.expiry || '',
    stage: opp?.stage || 'Identified',
    priority: opp?.priority || 'MEDIUM',
    incumbent: opp?.incumbent || '',
    strategy: opp?.strategy || '',
    contacts: opp?.contacts || []
  })
  const [contactsText, setContactsText] = useState(
    (opp?.contacts || []).map(c => `${c.name} | ${c.role} | ${c.email}`).join('\n')
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [autoActions, setAutoActions] = useState(true) // auto-generate actions on create

  function set(field, val) { setForm(prev => ({ ...prev, [field]: val })) }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    const contacts = contactsText.trim().split('\n').filter(Boolean).map(line => {
      const [name, role, email] = line.split('|').map(s => s.trim())
      return { name: name || '', role: role || '', email: email || '' }
    }).filter(c => c.name)

    await onSave({
      ...form,
      value: Number(form.value) || 0,
      contacts,
      autoGenerateActions: autoActions && !opp // only auto-generate for new opps
    })
    setSaving(false)
  }

  const isNew = !opp

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{opp ? 'Edit Opportunity' : 'Add Opportunity'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-2col">
            <div className="fgroup">
              <label>Title *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. USDA OCIO Drupal Web Dev" />
            </div>
            <div className="fgroup">
              <label>Agency</label>
              <input value={form.agency} onChange={e => set('agency', e.target.value)} placeholder="e.g. USDA / OCIO" />
            </div>
          </div>
          <div className="form-2col">
            <div className="fgroup">
              <label>Contract Number</label>
              <input value={form.contract_number} onChange={e => set('contract_number', e.target.value)} placeholder="e.g. 12314425F0109" />
            </div>
            <div className="fgroup">
              <label>Vehicle</label>
              <input value={form.vehicle} onChange={e => set('vehicle', e.target.value)} placeholder="e.g. MAS, STARS III" />
            </div>
          </div>
          <div className="form-2col">
            <div className="fgroup">
              <label>Value ($)</label>
              <input type="number" value={form.value} onChange={e => set('value', e.target.value)} placeholder="e.g. 4500000" />
            </div>
            <div className="fgroup">
              <label>Contract Expiry</label>
              <input type="date" value={form.expiry} onChange={e => set('expiry', e.target.value)} />
            </div>
          </div>
          <div className="form-2col">
            <div className="fgroup">
              <label>Stage</label>
              <select value={form.stage} onChange={e => set('stage', e.target.value)}>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="fgroup">
              <label>Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option>HIGH</option>
                <option>MEDIUM</option>
                <option>LOW</option>
              </select>
            </div>
          </div>
          <div className="fgroup">
            <label>Incumbent</label>
            <input value={form.incumbent} onChange={e => set('incumbent', e.target.value)} placeholder="Incumbent name (or leave blank if none)" />
          </div>
          <div className="fgroup">
            <label>Capture Strategy</label>
            <textarea value={form.strategy} onChange={e => set('strategy', e.target.value)} rows={3} placeholder="Win themes, positioning, differentiators…" />
          </div>
          <div className="fgroup">
            <label>Key Contacts <span className="fgroup-hint">One per line: Name | Role | email</span></label>
            <textarea value={contactsText} onChange={e => setContactsText(e.target.value)} rows={3}
              placeholder={'Jenna Highfill | CO | jenna.highfill@usda.gov\nRoxanne Lane | USDA SBO | roxanne.lane@usda.gov'} />
          </div>

          {/* Auto-generate actions toggle — only show for new opportunities */}
          {isNew && (
            <div className="auto-actions-toggle">
              <label className="toggle-label">
                <div className="toggle-switch-wrap">
                  <input type="checkbox" checked={autoActions} onChange={e => setAutoActions(e.target.checked)} />
                  <span className="toggle-switch" />
                </div>
                <div>
                  <div className="toggle-title">✅ Auto-generate capture actions</div>
                  <div className="toggle-sub">Claude will create 5-6 tailored action items when this opportunity is saved</div>
                </div>
              </label>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            {saving
              ? (isNew && autoActions ? 'Saving & generating actions…' : 'Saving…')
              : (opp ? 'Save Changes' : 'Add Opportunity')}
          </button>
        </div>
      </div>
    </div>
  )
}
