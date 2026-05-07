import React, { useState, useEffect, useRef } from 'react'
import { getCompanyDocs, upsertCompanyDoc, deleteCompanyDoc, uploadDocFile } from '../lib/supabase'

const DOC_TYPES = [
  { key: 'capability', label: 'Capability Statement', icon: '🏢', desc: 'Ark\'s core capabilities, NAICS codes, certifications, and contract vehicles', color: '#185FA5' },
  { key: 'past_performance', label: 'Past Performance', icon: '📋', desc: 'Project summaries, customer references, and performance history', color: '#3B6D11' },
  { key: 'partner', label: 'Teaming Partners', icon: '🤝', desc: 'Partner capability docs for Claude to suggest teaming when Ark has gaps', color: '#534AB7' }
]

export default function CompanySettings({ isAdmin }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [activeType, setActiveType] = useState('capability')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', partner_name: '', partner_naics: '', partner_certs: '' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    setLoading(true)
    const { data } = await getCompanyDocs()
    if (data) setDocs(data)
    setLoading(false)
  }

  async function handleUpload() {
    if (!selectedFile) { setError('Please select a file'); return }
    if (!form.name.trim()) { setError('Please enter a name'); return }
    if (activeType === 'partner' && !form.partner_name.trim()) { setError('Please enter partner company name'); return }

    setUploading(true)
    setError('')

    try {
      const ext = selectedFile.name.split('.').pop()
      const filePath = `${activeType}/${Date.now()}-${selectedFile.name.replace(/\s+/g, '-')}`

      const { error: uploadError } = await uploadDocFile(selectedFile, filePath)
      if (uploadError) throw new Error(uploadError.message)

      const { error: dbError } = await upsertCompanyDoc({
        doc_type: activeType,
        name: form.name.trim(),
        description: form.description.trim(),
        file_path: filePath,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        partner_name: form.partner_name.trim() || null,
        partner_naics: form.partner_naics.trim() || null,
        partner_certs: form.partner_certs.trim() || null,
      })
      if (dbError) throw new Error(dbError.message)

      await loadDocs()
      setShowForm(false)
      setForm({ name: '', description: '', partner_name: '', partner_naics: '', partner_certs: '' })
      setSelectedFile(null)
    } catch (err) {
      setError(err.message)
    }
    setUploading(false)
  }

  async function handleDelete(doc) {
    if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    await deleteCompanyDoc(doc.id, doc.file_path)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
  }

  function fmtSize(bytes) {
    if (!bytes) return ''
    if (bytes > 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
    return Math.round(bytes / 1024) + ' KB'
  }

  const activeDocs = docs.filter(d => d.doc_type === activeType)
  const activeType_ = DOC_TYPES.find(t => t.key === activeType)

  return (
    <div className="settings-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Company Settings</h1>
          <p className="page-sub">Manage Ark's profile, past performance, and teaming partners for Claude analysis</p>
        </div>
      </div>

      {/* Type selector */}
      <div className="doc-type-tabs">
        {DOC_TYPES.map(t => (
          <button
            key={t.key}
            className={`doc-type-tab ${activeType === t.key ? 'active' : ''}`}
            onClick={() => { setActiveType(t.key); setShowForm(false) }}
          >
            <span className="doc-type-icon">{t.icon}</span>
            <div>
              <div className="doc-type-label">{t.label}</div>
              <div className="doc-type-count">{docs.filter(d => d.doc_type === t.key).length} docs</div>
            </div>
          </button>
        ))}
      </div>

      {/* Description */}
      <div className="doc-section-desc" style={{ borderLeftColor: activeType_?.color }}>
        <strong>{activeType_?.label}</strong> — {activeType_?.desc}
      </div>

      {/* Docs list */}
      {loading ? (
        <div className="loading-inline">Loading documents…</div>
      ) : activeDocs.length === 0 ? (
        <div className="empty-docs">
          <div className="empty-docs-icon">{activeType_?.icon}</div>
          <div className="empty-docs-text">No {activeType_?.label.toLowerCase()} uploaded yet</div>
          {isAdmin && <div className="empty-docs-sub">Upload documents for Claude to use when analyzing opportunities</div>}
        </div>
      ) : (
        <div className="docs-list">
          {activeDocs.map(doc => (
            <div className="doc-card" key={doc.id}>
              <div className="doc-icon">
                {doc.file_name?.endsWith('.pdf') ? '📄' : doc.file_name?.endsWith('.docx') || doc.file_name?.endsWith('.doc') ? '📝' : '📎'}
              </div>
              <div className="doc-info">
                <div className="doc-name">{doc.name}</div>
                {doc.partner_name && <div className="doc-partner">Partner: {doc.partner_name}</div>}
                {doc.description && <div className="doc-desc">{doc.description}</div>}
                <div className="doc-meta">
                  {doc.file_name} {doc.file_size ? `· ${fmtSize(doc.file_size)}` : ''} · {new Date(doc.created_at).toLocaleDateString()}
                </div>
                {doc.partner_naics && <div className="doc-meta">NAICS: {doc.partner_naics}</div>}
                {doc.partner_certs && <div className="doc-meta">Certs: {doc.partner_certs}</div>}
              </div>
              {isAdmin && (
                <button className="doc-delete-btn" onClick={() => handleDelete(doc)} title="Delete">×</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload form */}
      {isAdmin && (
        <>
          {!showForm ? (
            <button className="btn primary upload-btn" onClick={() => setShowForm(true)}>
              + Upload {activeType_?.label} Document
            </button>
          ) : (
            <div className="upload-form">
              <div className="upload-form-title">Upload {activeType_?.label} Document</div>

              {activeType === 'partner' && (
                <>
                  <div className="form-row">
                    <label>Partner Company Name *</label>
                    <input type="text" value={form.partner_name} onChange={e => setForm(f => ({ ...f, partner_name: e.target.value }))}
                      placeholder="e.g. Booz Allen Hamilton" />
                  </div>
                  <div className="form-row-2col">
                    <div className="form-row">
                      <label>NAICS Codes</label>
                      <input type="text" value={form.partner_naics} onChange={e => setForm(f => ({ ...f, partner_naics: e.target.value }))}
                        placeholder="e.g. 541512, 541519" />
                    </div>
                    <div className="form-row">
                      <label>Certifications</label>
                      <input type="text" value={form.partner_certs} onChange={e => setForm(f => ({ ...f, partner_certs: e.target.value }))}
                        placeholder="e.g. 8(a), SDVOSB, HUBZone" />
                    </div>
                  </div>
                </>
              )}

              <div className="form-row">
                <label>Document Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={activeType === 'partner' ? "e.g. Booz Allen Capability Statement" : activeType === 'capability' ? "e.g. Ark Capability Statement 2026" : "e.g. USDA FPAC Past Performance"} />
              </div>

              <div className="form-row">
                <label>Description (optional)</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief notes about this document" />
              </div>

              <div className="form-row">
                <label>File (PDF or Word) *</label>
                <div className="file-drop" onClick={() => fileRef.current.click()}>
                  {selectedFile ? (
                    <div className="file-selected">
                      <span>📎 {selectedFile.name}</span>
                      <span className="file-size">{fmtSize(selectedFile.size)}</span>
                    </div>
                  ) : (
                    <div className="file-placeholder">
                      <div className="file-icon">📁</div>
                      <div>Click to select PDF or Word document</div>
                      <div className="file-sub">Supports .pdf, .docx, .doc</div>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.doc" style={{ display: 'none' }}
                  onChange={e => setSelectedFile(e.target.files[0])} />
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="form-actions">
                <button className="btn" onClick={() => { setShowForm(false); setError(''); setSelectedFile(null) }}>Cancel</button>
                <button className="btn primary" onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Upload Document'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
