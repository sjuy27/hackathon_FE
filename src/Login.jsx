import { useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Language, useApi } from './data'
import { DEMO_STORE_ID, loginMerchant, saveRole } from './auth'
import { LanguageSelect, NavIcon } from './Profile'

const loginCopy = {
  en: { welcome: 'Welcome to the market', intro: 'Watch short videos, find a stall, and order in Korean with one card.', guest: 'Continue as guest', guestHelp: 'No sign-up needed to browse and order' },
  ko: { welcome: '시장에 오신 걸 환영해요', intro: '숏폼으로 가게를 만나고, 주문 카드 한 장으로 한국어 주문까지.', guest: '게스트로 둘러보기', guestHelp: '가입 없이 둘러보고 주문할 수 있어요' },
  zh: { welcome: '欢迎来到市场', intro: '看短视频找店铺，一张点餐卡就能用韩语点餐。', guest: '以访客身份浏览', guestHelp: '无需注册即可浏览和点餐' },
}

// 첫 화면: 게스트 / 사장님 고르기
export function Login() {
  const lang = useContext(Language), t = loginCopy[lang], navigate = useNavigate()
  function guest() { saveRole('guest'); navigate('/shorts', { replace: true }) }
  return <div className="login-page">
    <div className="login-top"><span className="brand"><span className="brand-icon">◒</span> 골목</span><LanguageSelect/></div>
    <div className="login-hero"><h1>{t.welcome}</h1><p>{t.intro}</p></div>
    <div className="login-choices">
      <button className="login-choice" onClick={guest}><span className="guest-avatar"><NavIcon type="profile"/></span><span><strong>{t.guest}</strong><small>{t.guestHelp}</small></span><b>›</b></button>
      <Link className="login-choice merchant" to="/merchant/login"><span className="guest-avatar"><NavIcon type="store"/></span><span><strong>사장님 로그인 {lang !== 'ko' && <em>· Merchant</em>}</strong><small>가게 등록과 영상 만들기</small></span><b>›</b></Link>
    </div>
  </div>
}

// 사장님 로그인(사장님 화면은 항상 한국어). 인증 API가 없고, 데모는 데모 가게가 선택된 상태로 시작한다(가게 번호 입력칸 없음).
export function MerchantLogin() {
  const navigate = useNavigate(), store = useApi(`/stores/${DEMO_STORE_ID}`)
  function login(to) { loginMerchant(DEMO_STORE_ID); navigate(to, { replace: true }) }
  return <div className="login-page">
    <div className="login-top"><Link className="back" to="/login">← 처음으로</Link></div>
    <div className="login-hero"><span className="eyebrow">사장님 모드</span><h1>사장님, 어서 오세요</h1><p>내 가게를 바로 관리할 수 있어요.</p></div>
    <div className="panel login-form"><span className="small">내 가게</span><strong className="login-store">{store.data ? store.data.name_ko || store.data.name : store.isError ? '가게 정보를 불러오지 못했어요' : '불러오는 중…'}</strong><button className="button full" onClick={() => login('/merchant')}>이 가게로 시작하기</button></div>
    <div className="login-new"><p>가게 정보를 새로 말해 주실래요?</p><button className="button outline full" onClick={() => login('/merchant/register')}>말로 가게 등록하기</button></div>
  </div>
}
