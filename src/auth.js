// 로그인 상태(이 기기에만 저장). 서버에 인증 API가 없어서 역할과 가게 번호만 기억한다.
// role: 'guest' | 'merchant' | null(아직 고르지 않음)
// '로그인 상태 유지'를 끄면 사장님 로그인은 탭을 닫을 때까지만(sessionStorage) 유지한다.
const ROLE_KEY = 'golmok-role'
const STORE_KEY = 'golmok-store'
const CONTACT_KEY = 'golmok-merchant-contact'
// 데모는 이 가게가 선택된 상태로 시작한다(가게 번호 입력칸 없음). 다른 가게로 시연하려면 VITE_DEMO_STORE_ID 로 바꾼다.
export const DEMO_STORE_ID = Number(import.meta.env.VITE_DEMO_STORE_ID) || 1

export function readRole() {
  try { return sessionStorage.getItem(ROLE_KEY) || localStorage.getItem(ROLE_KEY) } catch { return null }
}
export function saveRole(role) {
  try { sessionStorage.removeItem(ROLE_KEY); localStorage.setItem(ROLE_KEY, role) } catch { /* Optional persistence. */ }
}
export function readMerchantContact() {
  try { return sessionStorage.getItem(CONTACT_KEY) || localStorage.getItem(CONTACT_KEY) || '' } catch { return '' }
}
export function loginMerchant(storeId, keep = true, phone = '') {
  try {
    const digits = phone.replace(/\D/g, '')
    const contact = /^01\d{8,9}$/.test(digits) ? digits : readMerchantContact()
    localStorage.removeItem(CONTACT_KEY)
    sessionStorage.removeItem(CONTACT_KEY)
    if (contact) (keep ? localStorage : sessionStorage).setItem(CONTACT_KEY, contact)
    if (storeId) localStorage.setItem(STORE_KEY, String(storeId))
    if (keep) saveRole('merchant')
    else { localStorage.setItem(ROLE_KEY, 'guest'); sessionStorage.setItem(ROLE_KEY, 'merchant') }
  } catch { /* Optional persistence. */ }
}
export function logoutMerchant() {
  saveRole('guest')
}
