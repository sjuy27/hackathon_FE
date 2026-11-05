import { useState } from 'react'
import { Link } from 'react-router-dom'
import RoleIcon from './RoleIcon'

// The supplied API has shop onboarding, but no account authentication endpoints.
// Credentials stay in the form: never persist them or simulate a session.
export default function Account({ signup = false }) {
  const [message, setMessage] = useState('')
  const title = signup ? '사장님 회원가입' : '사장님 로그인'
  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (signup && form.get('password') !== form.get('confirmPassword')) {
      setMessage('비밀번호가 일치하지 않습니다. 다시 확인해주세요.')
      return
    }
    setMessage('계정 서비스는 준비 중입니다. 지금은 회원가입 없이 가게 등록과 관리 기능을 이용할 수 있어요.')
  }
  return <div className="account-entry" lang="ko">
    <Link className="role-back" to="/host" aria-label="사장님 홈으로 돌아가기"><RoleIcon name="back"/></Link>
    <div className="account-entry-body">
      <span className="account-symbol"><RoleIcon name="shop"/></span>
      <h1>{title}</h1><p>{signup ? <>우리 가게의 이야기를<br/>세계의 손님에게 들려주세요</> : <>가게 등록, 영상 만들기, 통계를<br/>여기서 관리해요</>}</p>
      <form onSubmit={submit} onChange={() => setMessage('')}>
        {signup && <label htmlFor="owner-name">이름<input id="owner-name" name="name" autoComplete="name" required maxLength={50} placeholder="사장님 이름"/></label>}
        <label htmlFor="owner-phone">휴대폰 번호<input id="owner-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required pattern="01[016789]-?[0-9]{3,4}-?[0-9]{4}" title="010-0000-0000 형식의 휴대폰 번호를 입력해주세요." placeholder="010-0000-0000"/></label>
        <label htmlFor="owner-password">비밀번호<input id="owner-password" name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={8} maxLength={128} placeholder={signup ? '8자 이상 입력' : '비밀번호 입력'}/></label>
        {signup && <label htmlFor="owner-confirm">비밀번호 확인<input id="owner-confirm" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} placeholder="비밀번호를 다시 입력해주세요"/></label>}
        {!signup && <label className="account-checkbox"><input type="checkbox" defaultChecked/>로그인 상태 유지</label>}
        <p className="account-availability">계정 서비스 준비 중 · 가게 등록은 바로 이용할 수 있어요.</p>
        {message && <p className="account-message" role="status">{message}</p>}
        <button className="role-button primary" type="submit">{signup ? '회원가입' : '로그인'}</button>
      </form>
      <div className="account-links">{signup ? <Link to="/login">이미 계정이 있으신가요? 로그인</Link> : <><button type="button" onClick={() => setMessage('비밀번호 찾기는 계정 서비스 오픈 후 이용할 수 있어요.')}>비밀번호 찾기</button><span aria-hidden="true">|</span><Link to="/signup">처음이세요? 회원가입</Link></>}</div>
      <Link className="account-register" to="/host/register">회원가입 없이 가게 등록하기 →</Link>
    </div>
    <Link className="account-guest" to="/guest">Not a merchant? Continue as guest <span>›</span></Link>
  </div>
}
