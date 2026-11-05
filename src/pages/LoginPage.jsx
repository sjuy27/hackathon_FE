import { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Language } from '../data'
import { DEMO_STORE_ID, loginMerchant, readRole, saveRole } from '../auth'
import { LanguageSelect, NavIcon } from '../Profile'
import logo from '../assets/golmok-logo.png'

// lending.png: 첫 화면(게스트로 둘러보기 / 사장님 로그인)
const landingCopy = {
  en: { title: 'Every alley,\na new Flavor.', intro: "Watch short videos from seoul's traditional markets, then order in Korean with one tap.", start: 'Start exploring' },
  ko: { title: '골목마다,\n새로운 맛.', intro: '서울 전통시장의 숏폼을 보고, 한 번의 탭으로 한국어 주문까지.', start: '둘러보기 시작' },
  zh: { title: '每条小巷，\n都有新味道。', intro: '观看首尔传统市场的短视频，一键用韩语点餐。', start: '开始探索' },
}

export default function LoginPage() {
  const lang = useContext(Language), t = landingCopy[lang], navigate = useNavigate()
  function guest() { saveRole('guest'); navigate('/shorts', { replace: true }) }
  // 로그인 상태를 유지한 사장님은 로그인 화면을 건너뛴다.
  function merchant() { navigate(readRole() === 'merchant' ? '/merchant' : '/merchant/login') }
  return <div className="mobile-page login-landing">
    <div className="login-landing-top"><img className="login-logo" src={logo} alt="골목 GOLMOK"/><LanguageSelect/></div>
    <div className="login-landing-hero"><div className="login-landing-media" aria-hidden="true"/><h1>{t.title}</h1><p>{t.intro}</p></div>
    <div className="login-landing-actions">
      <button type="button" className="login-primary" onClick={guest}>{t.start}</button>
      <button type="button" className="login-secondary" onClick={merchant}><span lang="ko">사장님 로그인</span> · Merchant</button>
    </div>
  </div>
}

// mvpLen.png 오른쪽: 사장님 로그인(항상 한국어). 서버에 인증 API가 없어서 입력 형식만 확인하고 데모 가게로 로그인한다.
export function MerchantLoginPage() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState(''), [password, setPassword] = useState(''), [keep, setKeep] = useState(true), [message, setMessage] = useState('')
  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    return digits.length < 4 ? digits : digits.length < 8 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  function submit(event) {
    event.preventDefault()
    if (!/^01\d-\d{3,4}-\d{4}$/.test(phone)) return setMessage('휴대폰 번호를 다시 확인해 주세요.')
    if (!password) return setMessage('비밀번호를 입력해 주세요.')
    loginMerchant(DEMO_STORE_ID, keep, phone)
    navigate('/merchant', { replace: true })
  }
  function register() { loginMerchant(DEMO_STORE_ID, keep, phone); navigate('/merchant/register', { replace: true }) }
  function guest() { saveRole('guest'); navigate('/shorts', { replace: true }) }
  return <div className="mobile-page merchant-login-page" lang="ko">
    <span className="merchant-login-icon"><NavIcon type="store"/></span>
    <h1>사장님 로그인</h1>
    <p className="merchant-login-intro">가게 등록, 영상 만들기, 통계를<br/>여기서 관리해요.</p>
    <form className="merchant-login-form" onSubmit={submit} noValidate>
      <label>휴대폰 번호<input type="tel" inputMode="numeric" autoComplete="tel" value={phone} onChange={event => setPhone(formatPhone(event.target.value))} placeholder="010-0000-0000"/></label>
      <label>비밀번호<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="비밀번호 입력"/></label>
      <label className="merchant-login-keep"><input type="checkbox" checked={keep} onChange={event => setKeep(event.target.checked)}/>로그인 상태 유지</label>
      {message && <p className="merchant-login-error" role="alert">{message}</p>}
      <button className="login-primary">로그인</button>
    </form>
    <div className="merchant-login-links"><button type="button" onClick={() => setMessage('비밀번호 찾기는 준비 중이에요.')}>비밀번호 찾기</button><span aria-hidden="true">|</span><button type="button" className="strong" onClick={register}>처음이세요? 가게 등록하기</button></div>
    <button type="button" className="merchant-login-guest" onClick={guest} lang="en">Not a merchant? Continue as guest</button>
  </div>
}
