export const STEPS = ['store_name','menus','payment','hours','story']
export const stepNames = { store_name: '가게 이름', menus: '대표 메뉴', payment: '결제 방법', hours: '영업시간', story: '가게 이야기 (AI 요약)' }
export const paymentNames = { cash: '현금', card: '카드', foreign_card: '해외 카드', onnuri: '온누리상품권' }
export const fallbackQuestions = { store_name: '가게 이름을 알려주세요.', menus: '대표 메뉴와 가격을 말씀해 주세요.', payment: '가능한 결제 수단을 알려주세요.', hours: '영업시간을 알려주세요.', story: '가게만의 이야기를 들려주세요.' }
const keyNames = { name_ko:'이름', address:'주소', menus:'메뉴', price:'가격', spicy_level:'매운 정도', payment:'결제 수단', hours:'영업시간', story_ko:'가게 이야기', foreign_card:'해외 카드 사용 여부', cash:'현금', card:'카드', onnuri:'온누리상품권', is_ai_guess:'AI 추정 정보 확인' }
export function saved(key) {
  try { const value = Number(localStorage.getItem(key)); return Number.isSafeInteger(value) && value > 0 ? value : null } catch { return null }
}
export function remember(key,value) { try { localStorage.setItem(key,String(value)) } catch { /* Optional persistence. */ } }
export function needsCheckText(item,step) {
  return String(item).replace(/menus\[(\d+)\]\.name_ko/g,(_,n) => `메뉴 ${Number(n)+1} 이름`).replace(/menus\[(\d+)\]\.?/g,(_,n) => `메뉴 ${Number(n)+1} `).replace(/name_ko/g,step === 'menus' || /menus/.test(item) ? '메뉴 이름' : '가게 이름').replace(/[a-z_]+/g,key => keyNames[key] || key).replace(/\./g,' · ').trim()
}
export function stepLines(step,value = {}) {
  if (step === 'menus') return (value.menus || []).map(menu => `${menu.name_ko || menu.name || '이름 미입력'} ${menu.price == null ? '가격 확인 필요' : `${Number(menu.price).toLocaleString('ko-KR')}원`}`)
  if (step === 'payment') return [(value.payment || []).map(method => paymentNames[method] || method).join(' · ') || '미입력']
  return [value.name_ko || value.name || value.hours || value.story_ko || '미입력']
}
