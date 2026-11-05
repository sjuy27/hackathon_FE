export function remember(key, value) {
  try { localStorage.setItem(key, String(value)) } catch { /* Optional persistence. */ }
}

export function saved(key) {
  try {
    const value = Number(localStorage.getItem(key))
    return Number.isSafeInteger(value) && value > 0 ? value : null
  } catch { return null }
}

// 데모는 이 가게가 선택된 상태로 시작한다(가게 번호 입력칸 없음). 다른 가게로 시연하려면 VITE_DEMO_STORE_ID 로 바꾼다.
export const DEMO_STORE_ID = Number(import.meta.env.VITE_DEMO_STORE_ID) || 1
