import React, { useState, useEffect, useCallback } from 'react'
import { Plus, ChevronRight, LayoutDashboard, Settings as CogIcon } from 'lucide-react'
import { api } from './api'
import StatusBadge from './components/StatusBadge'
import JobModal from './components/JobModal'
import JobDetail from './components/JobDetail'
import SettingsPage from './pages/Settings'

function timeAgo(iso) {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso + 'Z')) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

function JobRow({ job, onClick, i }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'grid', gridTemplateColumns: '1fr 130px 120px 100px 100px 20px',
        alignItems: 'center', padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        background: hov ? 'rgba(255,255,255,0.025)' : 'transparent',
        cursor: 'pointer', transition: 'background 0.1s',
        animation: `fadeIn 0.18s ease ${i*25}ms both`,
      }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)', marginBottom: job.description ? 2 : 0 }}>{job.name}</div>
        {job.description && <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.3 }}>{job.description}</div>}
      </div>
      <StatusBadge status={job.status} paused={job.paused} />
      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t2)' }}>{timeAgo(job.last_ping)}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t3)' }}>
        {job.schedule_type === 'interval' ? `${job.schedule_value}m` : job.schedule_value}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: job.consecutive_failures > 0 ? 'var(--red)' : 'var(--t3)' }}>
        {job.consecutive_failures > 0 ? `${job.consecutive_failures} err` : job.last_duration ? `${job.last_duration.toFixed(1)}s` : '—'}
      </div>
      <ChevronRight size={12} color={hov ? 'var(--t2)' : 'var(--t4)'} />
    </div>
  )
}

export default function App() {
  const [jobs, setJobs] = useState([])
  const [page, setPage] = useState('dashboard')
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try { setJobs(await api.jobs.list()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [load])
  useEffect(() => { if (selected) { const u = jobs.find(j => j.id === selected.id); if (u) setSelected(u) } }, [jobs])

  const handleSave = async (form) => {
    editing ? await api.jobs.update(editing.id, form) : await api.jobs.create(form)
    await load(); setEditing(null)
  }
  const handleDelete = async (job) => {
    if (!confirm(`Delete "${job.name}"?`)) return
    await api.jobs.delete(job.id); setSelected(null); await load()
  }

  const failing = jobs.filter(j => j.status === 'failing').length
  const late    = jobs.filter(j => j.status === 'late').length
  const ok      = jobs.filter(j => j.status === 'ok' && !j.paused).length

  const systemColor = failing > 0 ? 'var(--red)' : late > 0 ? 'var(--amber)' : 'var(--green)'
  const systemLabel = failing > 0 ? `${failing} failing` : late > 0 ? `${late} late` : 'All nominal'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{ width: 220, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Logo */}
        <div style={{ padding: '20px 16px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d0d0e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--t1)', letterSpacing: '-0.02em', lineHeight: 1 }}>Watchdog</div>
              <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mono)', marginTop: 2 }}>v1.0.0</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'settings',  label: 'Settings',  icon: CogIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setPage(id); setSelected(null) }} style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%',
              padding: '8px 10px', borderRadius: 6, marginBottom: 2, textAlign: 'left',
              background: page === id ? 'rgba(163,230,53,0.08)' : 'none',
              borderLeft: page === id ? '2px solid var(--lime)' : '2px solid transparent',
              color: page === id ? 'var(--t1)' : 'var(--t3)',
              fontSize: 13, fontWeight: page === id ? 500 : 400,
              transition: 'all 0.12s',
            }}>
              <Icon size={14} color={page === id ? 'var(--lime)' : 'currentColor'} />
              {label}
            </button>
          ))}
        </nav>

        {/* Bottom: status + new job */}
        <div style={{ padding: '12px 12px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '0 4px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: systemColor, flexShrink: 0, animation: (failing > 0 || late > 0) ? 'blink 1.5s infinite' : 'none' }} />
            <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{systemLabel}</span>
          </div>
          {page === 'dashboard' && (
            <button onClick={() => { setEditing(null); setShowModal(true) }} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
              padding: '8px 0', borderRadius: 6, background: 'var(--lime)', color: '#0d0d0e',
              fontSize: 13, fontWeight: 600, transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity='1'}>
              <Plus size={14} strokeWidth={2.5} /> New job
            </button>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {page === 'settings' ? <SettingsPage /> : (
          <>
            {/* Stats header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', height: 52, borderBottom: '1px solid var(--border)', gap: 0, flexShrink: 0, background: 'var(--surface)' }}>
              {[
                { label: 'Jobs',    val: jobs.length, color: 'var(--t1)' },
                { label: 'Healthy', val: ok,           color: ok > 0 ? 'var(--green)' : 'var(--t3)' },
                { label: 'Late',    val: late,         color: late > 0 ? 'var(--amber)' : 'var(--t3)' },
                { label: 'Failing', val: failing,      color: failing > 0 ? 'var(--red)' : 'var(--t3)' },
              ].map((s, i) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 20, marginRight: 20, borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 500 }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: s.color, lineHeight: 1 }}>{s.val}</span>
                </div>
              ))}
            </div>

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 120px 100px 100px 20px', padding: '8px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              {['Job', 'Status', 'Last ping', 'Schedule', 'Last run', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: 48, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t4)' }}>loading...</div>
              ) : jobs.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, paddingBottom: 60 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--t2)' }}>No jobs monitored yet</div>
                  <div style={{ fontSize: 13, color: 'var(--t3)', textAlign: 'center', lineHeight: 1.6, maxWidth: 320 }}>
                    Add a job, copy its ping URL, and call it at the end of your script or cron job.
                  </div>
                  <button onClick={() => setShowModal(true)} style={{
                    marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'var(--lime)', color: '#0d0d0e', padding: '9px 18px',
                    borderRadius: 6, fontSize: 13, fontWeight: 600,
                  }}>
                    <Plus size={14} /> Add your first job
                  </button>
                </div>
              ) : (
                jobs.map((job, i) => <JobRow key={job.id} job={job} i={i} onClick={() => setSelected(job)} />)
              )}
            </div>
          </>
        )}
      </div>

      {selected && <JobDetail job={selected} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setShowModal(true) }} onDelete={() => handleDelete(selected)} />}
      {showModal && <JobModal job={editing} onClose={() => { setShowModal(false); setEditing(null) }} onSave={handleSave} />}
    </div>
  )
}
