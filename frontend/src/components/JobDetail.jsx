import React, { useState, useEffect, useRef } from 'react'
import { X, Zap, Copy, Check, RefreshCw, Trash2, Edit3 } from 'lucide-react'
import { api } from '../api'
import StatusBadge from './StatusBadge'

const ago = iso => {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso + 'Z')) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

const COLORS = { error: 'var(--red)', warning: 'var(--amber)', info: 'var(--t3)' }

export default function JobDetail({ job, onClose, onEdit, onDelete }) {
  const [logs, setLogs] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [tab, setTab] = useState('logs')
  const [diagnosing, setDiagnosing] = useState(false)
  const [copied, setCopied] = useState(false)
  const logsEnd = useRef(null)

  const load = async () => {
    const [l, d] = await Promise.all([api.jobs.logs(job.id), api.jobs.diagnoses(job.id)])
    setLogs(l); setDiagnoses(d)
  }
  useEffect(() => { load() }, [job.id])
  useEffect(() => { if (tab === 'logs') logsEnd.current?.scrollIntoView() }, [logs, tab])

  const diagnose = async () => {
    setDiagnosing(true)
    try { await api.jobs.diagnose(job.id); await load(); setTab('diagnoses') } finally { setDiagnosing(false) }
  }

  const copy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/ping/${job.ping_key}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const Btn = ({ onClick, children, variant = 'ghost', disabled }) => (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '6px 10px', borderRadius: 'var(--r)', fontSize: 12,
      background: variant === 'primary' ? 'var(--lime)' : variant === 'danger' ? 'var(--red-dim)' : 'var(--surface-2)',
      color: variant === 'primary' ? '#0d0d0e' : variant === 'danger' ? 'var(--red)' : 'var(--t2)',
      border: `1px solid ${variant === 'danger' ? 'var(--red-dim)' : 'var(--border)'}`,
      fontWeight: variant === 'primary' ? 600 : 400,
      opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer',
      transition: 'opacity 0.15s',
    }}>{children}</button>
  )

  return (
    <div style={{ width: 520, flexShrink: 0, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)', animation: 'slideIn 0.18s ease' }}>

      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--t1)', marginBottom: 4 }}>{job.name}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.4 }}>{job.description || 'No description'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusBadge status={job.status} paused={job.paused} />
            <button onClick={onClose} style={{ background: 'none', color: 'var(--t3)', padding: 2 }}><X size={15} /></button>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
          {[
            ['Schedule', job.schedule_type === 'interval' ? `every ${job.schedule_value}m` : job.schedule_value],
            ['Last ping', ago(job.last_ping)],
            ['Duration', job.last_duration ? `${job.last_duration.toFixed(1)}s` : '—'],
            ['Exit', job.last_exit_code != null ? String(job.last_exit_code) : '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{k}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t2)' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Ping URL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '7px 10px', marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--lime)', flexShrink: 0 }}>POST</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)', flex: 1, wordBreak: 'break-all' }}>{window.location.origin}/ping/{job.ping_key}</span>
          <button onClick={copy} style={{ background: 'none', color: copied ? 'var(--lime)' : 'var(--t3)', flexShrink: 0 }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Btn onClick={diagnose} variant="primary" disabled={diagnosing}>
            <Zap size={12} /> {diagnosing ? 'Diagnosing…' : 'AI Diagnose'}
          </Btn>
          <Btn onClick={load}><RefreshCw size={12} /> Refresh</Btn>
          <Btn onClick={onEdit}><Edit3 size={12} /> Edit</Btn>
          <div style={{ marginLeft: 'auto' }}>
            <Btn onClick={onDelete} variant="danger"><Trash2 size={12} /> Delete</Btn>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {[['logs', `Logs (${logs.length})`], ['diagnoses', `Diagnoses (${diagnoses.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '10px 16px', fontSize: 12, background: 'none', fontWeight: tab === id ? 500 : 400,
            color: tab === id ? 'var(--t1)' : 'var(--t3)',
            borderBottom: tab === id ? '2px solid var(--lime)' : '2px solid transparent',
            transition: 'all 0.12s',
          }}>{label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        {tab === 'logs' && (
          logs.length === 0
            ? <div style={{ color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 12, marginTop: 24 }}>No logs yet.</div>
            : <>
                {logs.map((l, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '2px 0', fontFamily: 'var(--mono)', fontSize: 11.5, lineHeight: 1.7 }}>
                    <span style={{ color: 'var(--t4)', flexShrink: 0 }}>{l.timestamp ? new Date(l.timestamp+'Z').toLocaleTimeString() : '—'}</span>
                    <span style={{ color: COLORS[l.level] || 'var(--t3)', flexShrink: 0, width: 36 }}>{l.level?.slice(0,4).toUpperCase()}</span>
                    <span style={{ color: l.level === 'error' ? 'var(--red)' : 'var(--t2)', wordBreak: 'break-all' }}>{l.message}</span>
                  </div>
                ))}
                <div ref={logsEnd} />
              </>
        )}

        {tab === 'diagnoses' && (
          diagnoses.length === 0
            ? <div style={{ color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 12, marginTop: 24 }}>No diagnoses yet. Run "AI Diagnose" above.</div>
            : diagnoses.map((d, i) => (
              <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14, marginBottom: 10, animation: 'fadeIn 0.2s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.trigger_reason}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>{ago(d.triggered_at)}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.65, marginBottom: 10 }}>{d.diagnosis}</div>
                <div style={{ height: 1, background: 'var(--border)', marginBottom: 10 }} />
                <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Suggested fix</div>
                <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.65 }}>{d.suggested_fix}</div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
