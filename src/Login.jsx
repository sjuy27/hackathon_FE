import { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from './api'
import { Language } from './data'
import { loginMerchant, saveRole } from './auth'
import { LanguageSelect, NavIcon } from './Profile'

const loginCopy = {
  en: { welcome: 'Welcome to the market', intro: 'Watch short videos, find a stall, and order in Korean with one card.', guest: 'Continue as guest', guestHelp: 'No sign-up needed to browse and order' },
  ko: { welcome: '시장에 오신 걸 환영해요', intro: '숏폼으로 가게를 만나고, 주문 카드 한 장으로 한국어 주문까지.', guest: '게스트로 둘러보기', guestHelp: '가입 없이 둘러보고 주문할 수 있어요' },
  zh: { welcome: '欢迎来到市场', intro: '看短视频找店铺，一张点餐卡就能用韩语点餐。', guest: '以访客身份浏览', guestHelp: '无需注册即可浏览和点餐' },
}

// 첫 화면: 게스트 / 사장님 고르기
export function Login() {
  const lang = useContext(Language), t = loginCopy[lang], navigate = useNavigate()
  function guest() { saveRole('guest'); navigate('/', { replace: true }) }
  return <div className="login-page">
    <div className="login-top"><span className="brand"><span className="brand-icon">◒</span> 골목</span><LanguageSelect/></div>
    <div className="login-hero"><h1>{t.welcome}</h1><p>{t.intro}</p></div>
    <div className="login-choices">
      <button className="login-choice" onClick={guest}><span className="guest-avatar"><NavIcon type="profile"/></span><span><strong>{t.guest}</strong><small>{t.guestHelp}</small></span><b>›</b></button>
      <Link className="login-choice merchant" to="/merchant/login"><span className="guest-avatar"><NavIcon type="store"/></span><span><strong>사장님 로그인 {lang !== 'ko' && <em>· Merchant</em>}</strong><small>가게 등록과 영상 만들기</small></span><b>›</b></Link>
    </div>
  </div>
}

// 사장님 로그인. 인증 API가 없어서 가게 번호로 내 가게를 불러온다(사장님 화면은 항상 한국어).
export function MerchantLogin() {
  const navigate = useNavigate(), [storeId, setStoreId] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await api(`/stores/${Number(storeId)}?lang=ko`)
      loginMerchant(Number(storeId))
      navigate('/merchant/video', { replace: true })
    } catch {
      setError('가게를 찾을 수 없어요. 가게 번호를 다시 확인해 주세요.')
    } finally { setBusy(false) }
  }
  function register() { loginMerchant(null); navigate('/merchant/register', { replace: true }) }
  return <div className="login-page">
    <div className="login-top"><Link className="back" to="/login">← 처음으로</Link></div>
    <div className="login-hero"><span className="eyebrow">사장님 모드</span><h1>사장님, 어서 오세요</h1><p>가게 번호를 넣으면 내 가게를 바로 관리할 수 있어요.</p></div>
    <form className="panel login-form" onSubmit={submit}>
      <label>가게 번호<input type="number" min="1" required inputMode="numeric" value={storeId} onChange={e => setStoreId(e.target.value)} placeholder="예: 3" /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="button full" disabled={busy || !storeId}>{busy ? '확인 중…' : '로그인'}</button>
    </form>
    <div className="login-new"><p>처음 오셨나요?</p><button className="button outline full" onClick={register}>말로 가게 등록하기</button></div>
  </div>
}
