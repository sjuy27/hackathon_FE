// 로그인 상태(이 기기에만 저장). 서버에 인증 API가 없어서 역할과 가게 번호만 기억한다.
// role: 'guest' | 'merchant' | null(아직 고르지 않음)
const ROLE_KEY = 'golmok-role'
const STORE_KEY = 'golmok-store'

export function readRole() {
  try { return localStorage.getItem(ROLE_KEY) } catch { return null }
}
export function saveRole(role) {
  try { localStorage.setItem(ROLE_KEY, role) } catch { /* Optional persistence. */ }
}
export function loginMerchant(storeId) {
  saveRole('merchant')
  try { if (storeId) localStorage.setItem(STORE_KEY, String(storeId)) } catch { /* Optional persistence. */ }
}
export function logoutMerchant() {
  saveRole('guest')
}
