import { localizeSchedules } from './schedule'

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')
export async function api(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`${API_BASE}${path}`, { method, signal, headers: body == null || body instanceof FormData ? undefined : { 'Content-Type': 'application/json' }, body: body == null ? undefined : body instanceof FormData ? body : JSON.stringify(body) })
  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = Array.isArray(data?.detail) ? data.detail.map(x => x.msg).join(', ') : typeof data?.detail === 'string' ? data.detail : null
    throw new Error(data?.error?.message || detail || `요청 실패 (${response.status})`)
  }
  if (data === null) throw new Error('API 응답을 읽을 수 없습니다. 잠시 후 다시 시도해주세요.')
  return method === 'GET' ? localizeSchedules(data,new URLSearchParams(path.split('?')[1] || '').get('lang')) : data
}
export function mediaUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return undefined
  try {
    const origin = window.location.origin
    const base = import.meta.env.VITE_MEDIA_BASE_URL?.trim() || new URL(API_BASE, origin).origin
    const resolved = new URL(url.trim(), `${base.replace(/\/$/, '')}/`)
    // Blob URLs are created locally for the host's selected photo previews.
    if (resolved.protocol === 'blob:') return resolved.origin === origin ? resolved.href : undefined
    return ['https:', 'http:'].includes(resolved.protocol) ? resolved.href : undefined
  } catch { return undefined }
}
