import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const F = ({ label, hint, children }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
    {children}
    {hint && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 5, fontFamily: 'var(--mono)', lineHeight: 1.5 }}>{hint}</div>}
  </div>
)

const Toggle = ({ label, checked, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10 }}>
    <div onClick={onChange} style={{
      width: 36, height: 20, borderRadius: 10, flexShrink: 0,
      background: checked ? 'var(--lime)' : 'var(--surface-2)',
      border: `1px solid ${checked ? 'var(--lime)' : 'var(--border-2)'}`,
      position: 'relative', transition: 'all 0.15s',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: checked ? 17 : 2,
        width: 14, height: 14, borderRadius: '50%',
        background: checked ? '#0d0d0e' : 'var(--t3)',
        transition: 'left 0.15s',
      }} />
    </div>
    <span style={{ fontSize: 13, color: 'var(--t2)' }}>{label}</span>
  </label>
)

export default function JobModal({ job, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', description: '', schedule_type: 'interval', schedule_value: '60', grace_period: 5, alert_telegram: true, alert_discord: false, ai_diagnosis_enabled: true })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  useEffect(() => { if (job) setForm(f => ({ ...f, ...job })) }, [job])

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try { await onSave(form); onClose() } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 10, width: 480, maxHeight: '88vh', overflowY: 'auto', padding: 24, animation: 'fadeIn 0.15s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--t1)' }}>{job ? 'Edit job' : 'New job'}</div>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--t3)', padding: 4 }}><X size={16} /></button>
        </div>

        <F label="Name"><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="my-scraper" autoFocus /></F>
        <F label="Description"><textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="What this job does" rows={2} style={{ resize: 'vertical' }} /></F>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <F label="Schedule type">
            <select value={form.schedule_type} onChange={e => set('schedule_type', e.target.value)}>
              <option value="interval">Interval</option>
              <option value="cron">Cron</option>
            </select>
          </F>
          <F label={form.schedule_type === 'interval' ? 'Every (minutes)' : 'Cron expression'}>
            <input value={form.schedule_value} onChange={e => set('schedule_value', e.target.value)} placeholder={form.schedule_type === 'interval' ? '60' : '0 * * * *'} />
          </F>
        </div>

        <F label="Grace period (minutes)" hint="How long after the expected run before marking as late">
          <input type="number" value={form.grace_period} min={1} onChange={e => set('grace_period', parseInt(e.target.value))} />
        </F>

        <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
        <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Alerts</div>
        <Toggle label="Telegram" checked={form.alert_telegram} onChange={() => set('alert_telegram', !form.alert_telegram)} />
        <Toggle label="Discord"  checked={form.alert_discord}  onChange={() => set('alert_discord',  !form.alert_discord)} />

        <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
        <Toggle label="AI failure diagnosis" checked={form.ai_diagnosis_enabled} onChange={() => set('ai_diagnosis_enabled', !form.ai_diagnosis_enabled)} />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border-2)', color: 'var(--t2)', borderRadius: 'var(--r)', padding: '8px 16px', fontSize: 13 }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ background: 'var(--lime)', color: '#0d0d0e', borderRadius: 'var(--r)', padding: '8px 18px', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save job'}
          </button>
        </div>
      </div>
    </div>
  )
}
