const BASE = '/api'

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`)
  return res.json()
}

export const api = {
  jobs: {
    list: () => req('GET', '/jobs'),
    create: (data) => req('POST', '/jobs', data),
    update: (id, data) => req('PUT', `/jobs/${id}`, data),
    delete: (id) => req('DELETE', `/jobs/${id}`),
    logs: (id) => req('GET', `/jobs/${id}/logs`),
    diagnose: (id) => req('POST', `/jobs/${id}/diagnose`),
    diagnoses: (id) => req('GET', `/jobs/${id}/diagnoses`),
  },
  settings: {
    get: () => req('GET', '/settings'),
    update: (data) => req('PUT', '/settings', data),
  },
}
