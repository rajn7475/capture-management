import React from 'react'

export default function ContactsView({ opps }) {
  const contacts = opps.flatMap(o =>
    (o.contacts || []).map(c => ({ ...c, oppTitle: o.title, oppId: o.id }))
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contacts</h1>
          <p className="page-sub">All agency contacts across your pipeline</p>
        </div>
      </div>
      <div className="contacts-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Opportunity</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr><td colSpan={4} className="table-empty">No contacts yet. Add them when creating opportunities.</td></tr>
            ) : contacts.map((c, i) => (
              <tr key={i}>
                <td>
                  <div className="contact-cell">
                    <div className="contact-avatar sm">{c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
                    {c.name}
                  </div>
                </td>
                <td className="text-muted">{c.role}</td>
                <td><a href={`mailto:${c.email}`} className="email-link">{c.email}</a></td>
                <td><span className="badge b-gray opp-badge">{c.oppTitle}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
