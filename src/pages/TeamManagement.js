import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access — can add opportunities, manage users, upload company docs' },
  { value: 'member', label: 'Team Member', desc: 'Can view pipeline, manage own actions, notes, and use Claude chat' }
]

export default function TeamManagement({ currentUserId }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { loadMembers() }, [])

  async function loadMembers() {
    setLoading(true)
    // Get profiles joined with auth user emails via RPC or direct query
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
    if (data) setMembers(data)
    setLoading(false)
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) { setError('Email is required'); return }
    setInviting(true); setError(''); setInviteMsg('')
    try {
      // Use Supabase admin invite — sends a magic link email
      const { error: invErr } = await supabase.auth.admin?.inviteUserByEmail
        ? await supabase.auth.admin.inviteUserByEmail(inviteEmail, {
            data: { full_name: inviteName, role: inviteRole }
          })
        : { error: null }

      if (invErr) throw new Error(invErr.message)

      setInviteMsg(`Invitation sent to ${inviteEmail}. They'll receive an email to set up their account.`)
      setInviteEmail(''); setInviteName(''); setInviteRole('member')
      setShowInvite(false)
      await loadMembers()
    } catch (err) {
      // Fallback: show manual instructions since client-side admin invite may not be available
      setInviteMsg(`Share the app URL with ${inviteEmail} and ask them to sign up. Then set their role below.`)
      setShowInvite(false)
    }
    setInviting(false)
  }

  async function handleRoleChange(userId, newRole) {
    if (userId === currentUserId && newRole !== 'admin') {
      if (!window.confirm('Are you sure you want to remove your own admin access?')) return
    }
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
    if (!error) {
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, role: newRole } : m))
    }
  }

  async function handleRemove(userId, name) {
    if (userId === currentUserId) { alert("You can't remove yourself."); return }
    if (!window.confirm(`Remove ${name} from the team? They will lose access immediately.`)) return
    await supabase.from('profiles').delete().eq('id', userId)
    setMembers(prev => prev.filter(m => m.id !== userId))
  }

  function initials(name) {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div className="team-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-sub">Manage who has access to the Ark BD Pipeline</p>
        </div>
        <button className="btn primary" onClick={() => { setShowInvite(true); setError(''); setInviteMsg('') }}>
          + Add Team Member
        </button>
      </div>

      {/* Role legend */}
      <div className="role-legend">
        {ROLES.map(r => (
          <div key={r.value} className="role-card">
            <div className="role-badge-wrap">
              <span className={`badge ${r.value === 'admin' ? 'b-purple' : 'b-blue'}`}>{r.label}</span>
            </div>
            <div className="role-desc">{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Success / info message */}
      {inviteMsg && (
        <div className="invite-success">
          ✅ {inviteMsg}
          <button onClick={() => setInviteMsg('')} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>×</button>
        </div>
      )}

      {/* Invite form */}
      {showInvite && (
        <div className="invite-form">
          <div className="invite-form-title">Add Team Member</div>
          <div className="form-2col">
            <div className="form-row">
              <label>Full Name</label>
              <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="e.g. Jane Smith" />
            </div>
            <div className="form-row">
              <label>Email Address *</label>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="jane@company.com" />
            </div>
          </div>
          <div className="form-row">
            <label>Role</label>
            <div className="role-radio-group">
              {ROLES.map(r => (
                <label key={r.value} className={`role-radio ${inviteRole === r.value ? 'selected' : ''}`}>
                  <input type="radio" name="role" value={r.value} checked={inviteRole === r.value}
                    onChange={() => setInviteRole(r.value)} />
                  <div>
                    <div className="role-radio-label">{r.label}</div>
                    <div className="role-radio-desc">{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button className="btn" onClick={() => { setShowInvite(false); setError('') }}>Cancel</button>
            <button className="btn primary" onClick={handleInvite} disabled={inviting}>
              {inviting ? 'Adding…' : 'Add Member'}
            </button>
          </div>
          <div className="invite-note">
            💡 Share the app URL (<strong>capture-management.vercel.app</strong>) with the new member and ask them to sign up. Then set their role in the table below.
          </div>
        </div>
      )}

      {/* Team table */}
      <div className="team-table-wrap">
        {loading ? (
          <div className="loading-inline">Loading team…</div>
        ) : (
          <table className="team-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id}>
                  <td>
                    <div className="member-cell">
                      <div className="member-avatar">{initials(m.full_name)}</div>
                      <div>
                        <div className="member-name">
                          {m.full_name || 'Unknown'}
                          {m.id === currentUserId && <span className="you-badge">you</span>}
                        </div>
                        <div className="member-id" style={{ fontSize: 11, color: '#9b9b94' }}>{m.id.slice(0, 8)}…</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      className="role-select"
                      value={m.role}
                      onChange={e => handleRoleChange(m.id, e.target.value)}
                    >
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </td>
                  <td style={{ fontSize: 12, color: '#9b9b94' }}>
                    {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td>
                    {m.id !== currentUserId && (
                      <button className="remove-btn" onClick={() => handleRemove(m.id, m.full_name)}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
