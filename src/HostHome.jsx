import { Link, NavLink } from 'react-router-dom'
import RoleIcon from './RoleIcon'

export function HostTitle({ title, children }) {
  return <div className="host-titlebar"><Link className="role-back" to="/host" aria-label="사장님 홈으로 돌아가기"><RoleIcon name="back"/></Link><h1>{title}</h1>{children}</div>
}

export function HostNav() {
  return <nav className="host-nav" aria-label="사장님 메뉴">
    {[['/host', 'home', '홈'], ['/host/edit', 'shop', '가게 정보'], ['/host/video', 'video', '영상'], ['/host/stats', 'chart', '통계']].map(([path, icon, label]) => <NavLink key={path} to={path} end={path === '/host'}><RoleIcon name={icon}/><span>{label}</span></NavLink>)}
  </nav>
}

export function HostMetrics() {
  return <div className="host-metrics"><div><span>이번 주 외국인 조회</span><strong>—</strong><small>집계 준비 중</small></div><div><span>주문 화면 열림</span><strong>—</strong><small>집계 준비 중</small></div></div>
}

export default function HostHome({ store, summary }) {
  const details = store.data
  const fields = details ? [details.name_ko || details.name, details.menus?.length, details.payment?.length, details.hours, details.story_ko || details.story] : []
  const completed = details ? fields.filter(Boolean).length : summary.data ? Object.keys(summary.data.steps || {}).length : 0
  const missing = details ? ['가게 이름', '메뉴·가격', '결제 방법', '영업시간', '가게 이야기'].filter((_, i) => !fields[i]).join(', ') : '가게 등록을 시작해주세요'
  return <div className="host-home">
    <div className="host-topline"><span className="host-badge">사장님 모드</span><Link className="host-guest-link" to="/guest">손님 화면 보기</Link></div>
    <h1>{details?.name_ko || details?.name ? <>{details.name_ko || details.name} 사장님,<br/>안녕하세요</> : <>사장님,<br/>안녕하세요</>}</h1>
    <p className="host-intro">오늘 할 일을 골라 주세요</p>
    <div className="host-progress"><div><strong>가게 정보</strong><strong>{Math.min(completed, 5)} / 5 완료</strong></div><progress value={Math.min(completed, 5)} max="5" aria-label="가게 정보 등록 진행률"/><p>{completed >= 5 ? '가게 정보를 모두 등록했어요' : details ? `아직 없는 정보: ${missing}` : missing}</p></div>
    {store.isError && <p className="error" role="alert">가게 정보를 불러오지 못했어요. <button onClick={() => store.refetch()}>다시 시도</button></p>}
    <div className="host-actions">
      <Link className="host-action primary" to="/host/register"><RoleIcon name="mic"/><span><strong>말로 가게 등록하기</strong><small>질문에 답만 하시면 AI가 정리해요</small></span></Link>
      <Link className="host-action" to="/host/video"><RoleIcon name="video"/><span><strong>영상 올리기</strong><small>가게 사진으로 AI가 영상을 만들어요</small></span></Link>
      <Link className="host-action" to="/host/edit"><RoleIcon name="edit"/><span><strong>메뉴·가격 고치기</strong><small>바뀐 가격을 바로 반영해요</small></span></Link>
    </div>
    <HostMetrics/>
  </div>
}
