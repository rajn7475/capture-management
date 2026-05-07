import React, { useState } from 'react'

const STAGES = ['Identified', 'Qualifying', 'Capture', 'Bid/No-Bid', 'Proposing', 'Submitted', 'Won', 'Lost']

const STAGE_COLORS = {
  'Identified': '#9b9b94',
  'Qualifying': '#378ADD',
  'Capture': '#7F77DD',
  'Bid/No-Bid': '#BA7517',
  'Proposing': '#BA7517',
  'Submitted': '#378ADD',
  'Won': '#1D9E75',
  'Lost': '#E24B4A'
}

export default function KanbanView({ opps, fmtVal, isAdmin, onStageChange, onEdit }) {
  const [dragOpp, setDragOpp] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  function handleDragStart(opp) {
    setDragOpp(opp)
  }

  function handleDragOver(e, stage) {
    e.preventDefault()
    setDragOver(stage)
  }

  function handleDrop(e, stage) {
    e.preventDefault()
    if (dragOpp && dragOpp.stage !== stage) {
      onStageChange(dragOpp.id, stage)
    }
    setDragOpp(null)
    setDragOver(null)
  }

  function handleDragEnd() {
    setDragOpp(null)
    setDragOver(null)
  }

  function daysTo(d) {
    if (!d) return null
    return Math.ceil((new Date(d) - new Date()) / 864e5)
  }

  function expiryColor(d) {
    const n = daysTo(d)
    if (n === null) return ''
    if (n < 0) return '#E24B4A'
    if (n <= 45) return '#E24B4A'
    if (n <= 90) return '#BA7517'
    return '#9b9b94'
  }

  const activeStages = STAGES.filter(s => s !== 'Won' && s !== 'Lost')
  const wonLostStages = ['Won', 'Lost']

  return (
    <div className="kanban-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pipeline Board</h1>
          <p className="page-sub">Drag opportunities across stages</p>
        </div>
      </div>

      {/* Main Kanban Board */}
      <div className="kanban-board">
        {activeStages.map(stage => {
          const stageOpps = opps.filter(o => o.stage === stage)
          const stageVal = stageOpps.reduce((s, o) => s + (Number(o.value) || 0), 0)
          const isOver = dragOver === stage

          return (
            <div
              key={stage}
              className={`kanban-col ${isOver ? 'drag-over' : ''}`}
              onDragOver={e => handleDragOver(e, stage)}
              onDrop={e => handleDrop(e, stage)}
            >
              <div className="kanban-col-header" style={{ borderTopColor: STAGE_COLORS[stage] }}>
                <div className="kanban-col-title">
                  <span className="kanban-stage-dot" style={{ background: STAGE_COLORS[stage] }} />
                  {stage}
                  <span className="kanban-count">{stageOpps.length}</span>
                </div>
                {stageVal > 0 && <div className="kanban-col-val">{fmtVal(stageVal)}</div>}
              </div>

              <div className="kanban-cards">
                {stageOpps.map(opp => {
                  const n = daysTo(opp.expiry)
                  return (
                    <div
                      key={opp.id}
                      className={`kanban-card ${dragOpp?.id === opp.id ? 'dragging' : ''} priority-${opp.priority?.toLowerCase()}`}
                      draggable={isAdmin}
                      onDragStart={() => handleDragStart(opp)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onEdit(opp)}
                    >
                      <div className="kanban-card-title">{opp.title}</div>
                      <div className="kanban-card-agency">{opp.agency}</div>
                      <div className="kanban-card-footer">
                        <span className="kanban-card-val">{fmtVal(opp.value)}</span>
                        <div className="kanban-card-badges">
                          <span className={`badge b-${opp.priority === 'HIGH' ? 'red' : opp.priority === 'MEDIUM' ? 'amber' : 'gray'}`} style={{ fontSize: '10px' }}>
                            {opp.priority}
                          </span>
                          {opp.expiry && (
                            <span className="kanban-expiry" style={{ color: expiryColor(opp.expiry) }}>
                              {n < 0 ? 'Expired' : n + 'd'}
                            </span>
                          )}
                        </div>
                      </div>
                      {opp.incumbent && (
                        <div className="kanban-incumbent">↳ {opp.incumbent}</div>
                      )}
                    </div>
                  )
                })}

                {stageOpps.length === 0 && (
                  <div className="kanban-empty">
                    {isOver ? 'Drop here' : 'No opportunities'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Won / Lost row */}
      <div className="kanban-won-lost">
        {wonLostStages.map(stage => {
          const stageOpps = opps.filter(o => o.stage === stage)
          const stageVal = stageOpps.reduce((s, o) => s + (Number(o.value) || 0), 0)
          const isOver = dragOver === stage

          return (
            <div
              key={stage}
              className={`kanban-wl-col ${isOver ? 'drag-over' : ''}`}
              onDragOver={e => handleDragOver(e, stage)}
              onDrop={e => handleDrop(e, stage)}
            >
              <div className="kanban-col-header" style={{ borderTopColor: STAGE_COLORS[stage] }}>
                <div className="kanban-col-title">
                  <span className="kanban-stage-dot" style={{ background: STAGE_COLORS[stage] }} />
                  {stage}
                  <span className="kanban-count">{stageOpps.length}</span>
                </div>
                {stageVal > 0 && <div className="kanban-col-val">{fmtVal(stageVal)}</div>}
              </div>
              <div className="kanban-wl-cards">
                {stageOpps.map(opp => (
                  <div key={opp.id}
                    className={`kanban-card ${dragOpp?.id === opp.id ? 'dragging' : ''}`}
                    draggable={isAdmin}
                    onDragStart={() => handleDragStart(opp)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onEdit(opp)}
                  >
                    <div className="kanban-card-title">{opp.title}</div>
                    <div className="kanban-card-footer">
                      <span className="kanban-card-val">{fmtVal(opp.value)}</span>
                    </div>
                  </div>
                ))}
                {stageOpps.length === 0 && <div className="kanban-empty">{isOver ? 'Drop here' : 'None'}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
