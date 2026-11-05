export function remember(key, value) {
  try { localStorage.setItem(key, String(value)) } catch { /* Optional persistence. */ }
}

export function saved(key) {
  try {
    const value = Number(localStorage.getItem(key))
    return Number.isSafeInteger(value) && value > 0 ? value : null
  } catch { return null }
}
