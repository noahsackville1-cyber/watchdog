import React from 'react'

const CFG = {
  ok:      { dot: '#4ade80', label: 'ok',      pulse: true },
  late:    { dot: '#fbbf24', label: 'late',    pulse: false },
  failing: { dot: '#f87171', label: 'failing', pulse: true },
  waiting: { dot: '#4a4a52', label: 'waiting', pulse: false },
  paused:  { dot: '#4a4a52', label: 'paused',  pulse: false },
}

export default function StatusBadge({ status, paused }) {
  const c = paused ? CFG.paused : (CFG[status] || CFG.waiting)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t2)' }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0,
        animation: c.pulse ? 'blink 1.8s ease-in-out infinite' : 'none',
      }} />
      {c.label}
    </span>
  )
}
