import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutMerchant, readMerchantContact, saveRole } from '../auth'
import Dialog from '../Dialog'
import { NavIcon } from '../Profile'
import { Button, MediaSlot, PageHeader } from '../components/MobileUI'
import useHostPreferences from '../components/host/use-host-preferences'
import useStoreProgress from '../components/host/use-store-progress'

export default function HostProfilePage({ store }) {
  const navigate = useNavigate()
  const { readQuestions, largeText, setReadQuestions, setLargeText } = useHostPreferences()
  const { completed } = useStoreProgress(store)
  const [helpOpen, setHelpOpen] = useState(false)
  const contact = readMerchantContact()
  const name = store.name_ko || store.name
  const market = store.market?.name_ko || store.market?.name
  function guest() { saveRole('guest'); navigate('/shorts') }
  function logout() { logoutMerchant(); navigate('/login', { replace: true }) }

  return <div className="mobile-page host-page host-profile-page" lang="ko">
    <PageHeader title="마이페이지" showLanguage={false} end={<span className="host-mode">사장님 모드</span>}/>
    <div className="host-profile-card">
      <MediaSlot src={store.thumbnail_url} alt={`${name} 가게 사진`} kind="host-profile-photo" label="사진"/>
      <div><h2>{name}</h2><p>{name} 사장님{market && ` · ${market}`}</p><strong>가게 정보 {completed} / 5 등록 {completed === 5 ? '완료' : '진행 중'}</strong></div>
    </div>
    <section className="host-profile-section"><h2>내 가게</h2>
      <Button to="/merchant/register" className="host-profile-row"><span>말로 가게 정보 고치기</span><span aria-hidden="true">›</span></Button>
    </section>
    <section className="host-profile-section"><h2>편하게 쓰기</h2>
      <label className="host-profile-row"><span>질문 소리로 읽어 주기</span><input type="checkbox" checked={readQuestions} onChange={event => setReadQuestions(event.target.checked)}/></label>
      <label className="host-profile-row"><span>글씨 크게 보기</span><input type="checkbox" checked={largeText} onChange={event => setLargeText(event.target.checked)}/></label>
    </section>
    <button className="host-profile-help" type="button" onClick={() => setHelpOpen(true)}><NavIcon type="phone"/><span><strong>상인회에 도움 요청</strong><small>어려운 건 매니저가 대신 해 드려요</small></span></button>
    <div className="host-profile-actions"><Button onClick={guest}><strong>손님 화면으로</strong><span lang="en">Guest mode</span></Button><Button onClick={logout} className="host-profile-logout">로그아웃</Button></div>
    {helpOpen && <Dialog label="상인회에 도움 요청" onClose={() => setHelpOpen(false)}>
      <h2>상인회에 도움 요청</h2>
      {contact ? <><p>회원가입 시 입력한 기본 연락처입니다.</p><p className="host-contact-number">{contact.replace(/^(01\d)(\d{3,4})(\d{4})$/, '$1-$2-$3')}</p><a className="mobile-button primary" href={`tel:${contact}`}>전화 연결</a></> : <p>등록된 연락처가 없습니다. 사장님 로그인 화면에서 휴대폰 번호를 입력해 주세요.</p>}
      <Button onClick={() => setHelpOpen(false)}>닫기</Button>
    </Dialog>}
  </div>
}
