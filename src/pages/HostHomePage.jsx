import { useState } from 'react'
import { Button, FilterChips, PageHeader } from '../components/MobileUI'
import HostActionCard from '../components/host/HostActionCard'
import useStoreProgress from '../components/host/use-store-progress'
import { hostStatsMock } from './host-stats-mock'

const metricNames = [['foreignViews', '외국인 조회'], ['orders', '주문 화면 열림'], ['videoViews', '영상 조회'], ['directions', '길찾기']]
const periods = [['today', '오늘'], ['week', '이번 주'], ['month', '이번 달']]
const number = value => value.toLocaleString('ko-KR')

export default function HostHomePage({ store, statistics = false }) {
  const { completed, missing } = useStoreProgress(store)
  const [period, setPeriod] = useState('week')
  const stats = hostStatsMock[statistics ? period : 'week']
  const metrics = <div className="host-metrics">{metricNames.slice(0, statistics ? 4 : 2).map(([key, label]) => <div key={key}><span>{!statistics && key === 'foreignViews' ? `이번 주 ${label}` : label}</span><strong>{number(stats[key])}</strong><small className="host-muted">지난주 대비 {stats.changes[key] > 0 ? '+' : ''}{stats.changes[key]}%</small></div>)}</div>
  if (statistics) {
    const funnel = [['영상 봄', stats.videoViews], ['가게 페이지', stats.foreignViews], ['길찾기', stats.directions], ['주문 화면', stats.orders]]
    const menus = (store.menus || []).filter(menu => menu.name_ko || menu.name).slice(0, 3)
    return <div className="mobile-page host-page host-stats-page">
      <PageHeader title="통계" back="/merchant" showLanguage={false}/>
      <FilterChips label="통계 기간" options={periods} value={period} onChange={setPeriod}/>
      {metrics}
      <div className="host-info-list">
        <section className="host-confirm-card"><h2>영상 보고 가게까지 온 흐름</h2><div className="host-stats-flow">{funnel.map(([label, value]) => <div key={label}><div><span>{label}</span><strong>{number(value)}</strong></div><progress value={value} max={stats.videoViews} aria-label={label}/></div>)}</div></section>
        <section className="host-confirm-card"><h2>많이 주문한 메뉴</h2>{menus.length ? <dl className="host-answer-values">{menus.map((menu, index) => <div key={menu.menu_id || index}><dt>{index + 1}위 · {menu.name_ko || menu.name}</dt><dd>{number(stats.menuOrders[index])}회</dd></div>)}</dl> : <p className="host-muted">등록된 메뉴가 없어요.</p>}</section>
        <section className="host-confirm-card"><h2>어떻게 찾아왔나요</h2><div className="host-preview-tags">{[['shorts', '숏폼'], ['contents', 'K-콘텐츠'], ['map', '지도']].map(([key, label]) => <span key={key}>{label} {stats.traffic[key]}%</span>)}</div><p className="host-muted">언어 비율</p><div className="host-preview-tags"><span>영어 {stats.languages.en}%</span><span>중국어 {stats.languages.zh}%</span></div></section>
        <section className="host-confirm-card"><h2>AI 한마디</h2><p>저녁 6~8시에 외국인 조회가 가장 많아요. 이 시간 전에 새 영상을 올려 보세요.</p></section>
      </div>
      <p className="host-muted">시연용 예시 데이터예요</p>
    </div>
  }
  return <div className="mobile-page host-page host-home-page">
    <div className="host-home-top"><span className="host-mode">사장님 모드</span><Button to="/shorts">손님 화면 보기</Button></div>
    <h1>{store.name_ko || store.name} 사장님, 안녕하세요</h1><p className="host-home-intro">오늘 할 일을 골라 주세요.</p>
    <section className="host-progress-card"><div><span>가게 정보</span><strong>{Math.min(completed,5)} / 5 완료</strong></div><progress value={Math.min(completed,5)} max="5" aria-label="가게 정보 등록 진행률"/><p>{missing.length ? `아직 없는 정보: ${missing.join(', ')}` : '가게 정보를 모두 등록했어요.'}</p></section>
    <div className="host-home-actions"><HostActionCard to="/merchant/register" state={{ voice: true }} icon="mic" primary title="말로 가게 정보 등록/수정하기" description="질문에 답만 하시면 AI가 정리해요."/><HostActionCard to="/merchant/video" icon="video" title="영상 만들기" description="사진 한 장만 있어도 AI가 영상을 만들어요."/><HostActionCard to="/merchant/edit" icon="edit" title="메뉴·가격 고치기" description="바뀐 가격을 바로 반영해요."/></div>
    {metrics}
    <p className="host-muted">시연용 예시 데이터예요</p>
  </div>
}
