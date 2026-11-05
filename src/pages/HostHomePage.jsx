import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { Button, PageHeader } from '../components/MobileUI'
import HostActionCard from '../components/host/HostActionCard'
import { saved, STEPS } from '../components/host/host-model'

const fields = ['가게 이름', '메뉴', '결제 방법', '영업시간', '가게 이야기']
export default function HostHomePage({ store, statistics = false }) {
  const [sessionId] = useState(() => saved('golmok-session'))
  const summary = useQuery({ queryKey: ['onboarding-summary',sessionId], enabled: !!sessionId, queryFn: () => api(`/merchant/onboarding/sessions/${sessionId}/summary`) })
  const values = [store.name_ko || store.name, store.menus?.length, store.payment?.length, store.hours, store.story_ko || store.story]
  const completed = summary.data ? STEPS.filter(step => summary.data.steps?.[step]).length : values.filter(Boolean).length
  const missing = summary.data ? fields.filter((_,index) => !summary.data.steps?.[['store_name','menus','payment','hours','story'][index]]) : fields.filter((_,index) => !values[index])
  const metrics = <div className="host-metrics"><div><span>이번 주 외국인 조회</span><strong aria-label="집계 준비 중">—</strong></div><div><span>주문 화면 열림</span><strong aria-label="집계 준비 중">—</strong></div></div>
  if (statistics) return <div className="mobile-page host-page"><PageHeader title="통계" back="/merchant" showLanguage={false}/>{metrics}<p className="host-muted">통계 서비스 준비 중입니다.</p></div>
  return <div className="mobile-page host-page host-home-page">
    <div className="host-home-top"><span className="host-mode">사장님 모드</span><Button to="/shorts">손님 화면 보기</Button></div>
    <h1>{store.name_ko || store.name} 사장님, 안녕하세요</h1><p className="host-home-intro">오늘 할 일을 골라 주세요.</p>
    <section className="host-progress-card"><div><span>가게 정보</span><strong>{Math.min(completed,5)} / 5 완료</strong></div><progress value={Math.min(completed,5)} max="5" aria-label="가게 정보 등록 진행률"/><p>{missing.length ? `아직 없는 정보: ${missing.join(', ')}` : '가게 정보를 모두 등록했어요.'}</p></section>
    <div className="host-home-actions"><HostActionCard to="/merchant/register" icon="mic" primary title="말로 가게 등록하기" description="질문에 답만 하시면 AI가 정리해요."/><HostActionCard to="/merchant/video" icon="video" title="영상 올리기" description="사진 한 장만 있어도 AI가 영상을 만들어요."/><HostActionCard to="/merchant/edit" icon="edit" title="메뉴·가격 고치기" description="바뀐 가격을 바로 반영해요."/></div>
    {metrics}
  </div>
}
