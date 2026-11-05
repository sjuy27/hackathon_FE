import { useState } from 'react'
import { Button, FilterChips, MediaSlot, PageHeader } from '../components/MobileUI'
import HostInfoCard from '../components/host/HostInfoCard'
import { STEPS, needsCheckText } from '../components/host/host-model'
import { ErrorMessage, State } from '../shared'

export default function HostReviewPage({ summary, sessionId, publish, store, onRestart }) {
  const [lang, setLang] = useState('en')
  const value = summary.data, preview = value?.[`preview_${lang}`] ?? value?.preview_en
  const languageName = lang === 'zh' ? '중국어' : '영어'
  return <div className="mobile-page host-page host-review-page" lang="ko"><PageHeader title="AI 정리 결과" back="/merchant" showLanguage={false}/><p className="host-muted">틀린 곳만 눌러서 고치세요</p><State query={summary}>{value && <>
    <div className="host-info-list">{STEPS.filter(step => value.steps[step]).map(step => { const edits = value.steps[step]?.parsed || value.steps[step]; const warning = value.needs_check?.some(item => item.includes(step) || (step === 'payment' && /카드|결제/.test(item))); return <HostInfoCard key={`${step}-${JSON.stringify(edits)}`} step={step} value={edits} warning={warning} sessionId={sessionId} onSaved={() => summary.refetch()}/> })}</div>
    <p className="host-muted">{value.needs_check?.length ? value.needs_check.map(item => needsCheckText(item)).join(' · ') : '설명은 초안을 참고용으로만 제공해요. 확인 후 사장님이 직접 고쳐 주세요.'}</p>
    <h2 className="host-preview-heading">외국인 손님에게는 이렇게 보여요</h2><div className="host-language-tabs"><FilterChips label="미리보기 언어" options={[["en","EN"],["zh","中文"]]} value={lang} onChange={setLang}/></div>
    {preview ? <article className="host-preview-card" lang={lang}><MediaSlot src={store.videos?.[0]?.thumbnail_url} alt={preview.name || store.name} label="가게 사진"/><div><h3>{preview.name}</h3><p>{store.market.name}</p><p>{preview.payment?.join(' · ')}</p><div className="host-preview-tags">{preview.menus?.map((menu,i) => <span key={i}>{menu.name || menu.name_ko}</span>)}</div></div></article> : <p className="host-muted" role="status">{languageName} 미리보기를 준비하고 있어요.</p>}
    {preview?.translated === false && <p className="host-muted" role="status">{languageName}로 번역 중이에요…</p>}
    <ErrorMessage error={publish.error}/>
    <div className="host-footer host-info-list"><Button disabled={publish.isPending} onClick={onRestart}>처음부터 다시 등록</Button><Button primary disabled={!value.done || summary.isFetching || publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? '가게 정보를 올리고 있어요…' : '가게 정보 올리기'}</Button></div>
  </>}</State></div>
}
