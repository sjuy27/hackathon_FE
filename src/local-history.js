export function readIds(key) {
  try { const ids = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(ids) ? ids.filter(id => Number.isInteger(id) && id > 0).slice(0, 50) : [] } catch { return [] }
}
export function writeIds(key, ids) { try { localStorage.setItem(key, JSON.stringify(ids)) } catch { /* Optional local history. */ } }
export function rememberShop(id) { writeIds('golmok-recent-shops', [id, ...readIds('golmok-recent-shops').filter(old => old !== id)].slice(0, 8)) }
