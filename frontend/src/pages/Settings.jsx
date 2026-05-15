import React, { useState, useEffect } from 'react'
import { Check, Key, MessageSquare, Hash, Globe, Database } from 'lucide-react'
import { api } from '../api'

const Toggle = ({ checked, onChange }) => (
  <div onClick={onChange} style={{
    width: 36, height: 20, borderRadius: 10, flexShrink: 0, cursor: 'pointer',
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
)

function Row({ label, hint, children, status }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, padding: '16px 0', borderBottom: '1px solid var(--border)', alignItems: 'start' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
          {label}
          {status !== undefined && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: 'var(--mono)', color: status ? 'var(--green)' : 'var(--t4)' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
              {status ? 'set' : 'not set'}
            </span>
          )}
        </div>
        {hint && <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Icon size={14} color="var(--lime)" />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</div>
      </div>
      <div style={{ borderTop: '1px solid var(--border)' }}>{children}</div>
    </div>
  )
}

export default function Settings() {
  const [form, setForm] = useState({ anthropic_api_key: '', telegram_bot_token: '', telegram_chat_id: '', discord_webhook_url: '', max_log_lines: 500, diagnosis_log_lines: 100 })
  const [cur, setCur] = useState({})
  const [saved, setSaved] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.settings.get().then(s => {
      setCur(s)
      setForm(f => ({ ...f, telegram_chat_id: s.telegram_chat_id || '', max_log_lines: s.max_log_lines || 500, diagnosis_log_lines: s.diagnosis_log_lines || 100 }))
    })
  }, [])

  const save = async () => {
    const p = Object.fromEntries(Object.entries(form).filter(([,v]) => v !== ''))
    await api.settings.update(p)
    setCur(await api.settings.get())
    setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  const inputStyle = { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--t1)', borderRadius: 6, padding: '8px 12px', fontSize: 13, fontFamily: 'var(--mono)', width: '100%', outline: 'none', transition: 'border-color 0.15s' }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '36px 32px 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--t1)', marginBottom: 4 }}>Settings</div>
          <div style={{ fontSize: 13, color: 'var(--t3)' }}>Configure alerting, AI diagnosis, and log retention.</div>
        </div>

        <Section title="AI Diagnosis" icon={Key}>
          <Row label="Anthropic API key" hint="Powers AI failure diagnosis." status={cur.anthropic_api_key_set}>
            <input type="password" value={form.anthropic_api_key} onChange={e => set('anthropic_api_key', e.target.value)}
              placeholder={cur.anthropic_api_key_set ? cur.anthropic_api_key_preview : 'sk-ant-...'} style={inputStyle}
              onFocus={e => e.target.style.borderColor='var(--lime)'}
              onBlur={e => e.target.style.borderColor='var(--border)'} />
          </Row>
          <Row label="Log lines sent to AI" hint="Lines included in diagnosis context.">
            <input type="number" value={form.diagnosis_log_lines} min={10} max={500} onChange={e => set('diagnosis_log_lines', parseInt(e.target.value))} style={{ ...inputStyle, width: 120 }}
              onFocus={e => e.target.style.borderColor='var(--lime)'}
              onBlur={e => e.target.style.borderColor='var(--border)'} />
          </Row>
        </Section>

        <Section title="Telegram" icon={MessageSquare}>
          <Row label="Bot token" hint="Create via @BotFather on Telegram." status={cur.telegram_bot_token_set}>
            <input type="password" value={form.telegram_bot_token} onChange={e => set('telegram_bot_token', e.target.value)}
              placeholder={cur.telegram_bot_token_set ? cur.telegram_bot_token_preview : '1234567890:ABC...'} style={inputStyle}
              onFocus={e => e.target.style.borderColor='var(--lime)'}
              onBlur={e => e.target.style.borderColor='var(--border)'} />
          </Row>
          <Row label="Chat ID" hint="Your personal or group chat ID.">
            <input value={form.telegram_chat_id} onChange={e => set('telegram_chat_id', e.target.value)}
              placeholder="-1001234567890" style={{ ...inputStyle, width: 200 }}
              onFocus={e => e.target.style.borderColor='var(--lime)'}
              onBlur={e => e.target.style.borderColor='var(--border)'} />
          </Row>
        </Section>

        <Section title="Discord" icon={Globe}>
          <Row label="Webhook URL" hint="Server Settings → Integrations → Webhooks." status={cur.discord_webhook_url_set}>
            <input type="password" value={form.discord_webhook_url} onChange={e => set('discord_webhook_url', e.target.value)}
              placeholder="https://discord.com/api/webhooks/..." style={inputStyle}
              onFocus={e => e.target.style.borderColor='var(--lime)'}
              onBlur={e => e.target.style.borderColor='var(--border)'} />
          </Row>
        </Section>

        <Section title="Log Retention" icon={Database}>
          <Row label="Max log lines per job" hint="Older entries are pruned automatically.">
            <input type="number" value={form.max_log_lines} min={50} max={10000} onChange={e => set('max_log_lines', parseInt(e.target.value))} style={{ ...inputStyle, width: 120 }}
              onFocus={e => e.target.style.borderColor='var(--lime)'}
              onBlur={e => e.target.style.borderColor='var(--border)'} />
          </Row>
        </Section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, paddingTop: 8 }}>
          {saved && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--green)' }}>
              <Check size={13} /> Saved
            </span>
          )}
          <button onClick={save} style={{ background: 'var(--lime)', color: '#0d0d0e', padding: '9px 22px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
            Save settings
          </button>
        </div>
      </div>
    </div>
  )
}
