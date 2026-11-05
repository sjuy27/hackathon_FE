import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../api'
import { speakQuestion } from '../../merchant-voice'
import { saved, remember, fallbackQuestions, STEPS } from './host-model'
import HostRegistrationPage from '../../pages/HostRegistrationPage'
import HostReviewPage from '../../pages/HostReviewPage'
import { Button, PageHeader } from '../MobileUI'

const INTRODUCTION = '안녕하세요 사장님. 지금부터 가게에 대해 다섯 가지를 여쭤볼게요. 말씀하시고 잠깐 쉬시면 자동으로 다음으로 넘어가요.'
const WARNINGS_KEY = 'golmok-session-warnings'

function readAnswerWarnings() {
  try { return JSON.parse(localStorage.getItem(WARNINGS_KEY)) || {} } catch { return {} }
}

function restoreAnswerWarnings(summary, warnings) {
  if (warnings.sessionId !== summary.session_id) return summary
  const retained = Object.entries(warnings.steps || {}).flatMap(([step, answer]) =>
    JSON.stringify(summary.steps?.[step]?.parsed) === JSON.stringify(answer.parsed) ? answer.needs_check : []
  )
  return { ...summary, needs_check: [...new Set([...(summary.needs_check || []), ...retained])] }
}

export default function OnboardingFlow({ store, onPublished, review = false }) {
  const location = useLocation(), navigate = useNavigate()
  const [entryIntroductionDone,setEntryIntroductionDone] = useState(false), [greetedSession,setGreetedSession] = useState(() => saved('golmok-session-intro'))
  const [sessionId,setSessionId] = useState(() => saved('golmok-session')), [question,setQuestion] = useState(null), [answer,setAnswer] = useState(null), [input,setInput] = useState(''), [manualInput,setManualInput] = useState(false), [capturing,setCapturing] = useState(false), [sent,setSent] = useState(''), [done,setDone] = useState(false), [voiceEnabled,setVoiceEnabled] = useState(() => location.state?.voice === true)
  const [answerWarnings, setAnswerWarnings] = useState(readAnswerWarnings)
  const sending = useRef(false), confirming = useRef(false), started = useRef(false), spoken = useRef(null)
  const summary = useQuery({ queryKey:['onboarding-summary',sessionId], enabled:!!sessionId, refetchOnMount:'always', queryFn: () => api(`/merchant/onboarding/sessions/${sessionId}/summary`), select: data => restoreAnswerWarnings(data,answerWarnings), refetchInterval: query => query.state.data?.preview_en?.translated === false ? 1500 : false })
  function reset(data) { setQuestion(data); setAnswer(null); setInput(''); setManualInput(false); setCapturing(false); setSent(''); confirming.current = false }
  const start = useMutation({ mutationFn: () => api('/merchant/onboarding/sessions',{method:'POST',body:{store_id:store.store_id}}), onSuccess: data => { setSessionId(data.session_id); remember('golmok-session',data.session_id); reset(data); setDone(false); setEntryIntroductionDone(false); setGreetedSession(null); remember('golmok-session-intro','') } })
  const startSession = start.mutate
  useEffect(() => { if(!sessionId && !review && !started.current) { started.current = true; startSession() } },[sessionId,review,startSession])
  useEffect(() => () => spoken.current?.(),[])
  const confirm = useMutation({
    mutationFn: ({step,accepted,edits}) => api(`/merchant/onboarding/sessions/${sessionId}/confirm`,{method:'POST',body:{step,accepted,edits}}),
    retry: false,
    onSuccess: data => {reset(data);setDone(data.done);summary.refetch()},
    onSettled: () => {confirming.current=false}
  })
  function acceptAnswer(payload) {
    if (confirming.current || !payload?.step) return
    confirming.current = true
    confirm.mutate(payload)
  }
  const send = useMutation({ mutationFn: ({text,audio}) => { if(audio?.size > 10*1024*1024)throw new Error('음성 파일은 10MB 이하로 보내주세요.'); const body = new FormData(); if(text?.trim())body.append('text',text.trim()); else body.append('audio',audio,'blob'); return api(`/merchant/onboarding/sessions/${sessionId}/answers`,{method:'POST',body}) },onSuccess:data => {
    setAnswer(data)
    // edits로 자동 확인하면 서버에서 지우는 경고를, 실제 값을 고치기 전까지 보관한다.
    const warnings = { sessionId, steps: { ...(answerWarnings.sessionId === sessionId ? answerWarnings.steps : {}), [data.step]: { parsed:data.parsed, needs_check:data.needs_check || [] } } }
    setAnswerWarnings(warnings)
    remember(WARNINGS_KEY,JSON.stringify(warnings))
    acceptAnswer({step:data.step,accepted:true,edits:data.parsed})
  },onSettled:()=>{sending.current=false} })
  function submit(payload) { if(!sessionId || sending.current || confirming.current || answer || (!payload.text?.trim() && !payload.audio))return; sending.current = true;setSent(payload.text?.trim() || '(녹음한 답변)');setManualInput(false);send.mutate(payload) }
  const publish = useMutation({mutationFn:()=>api(`/merchant/onboarding/sessions/${sessionId}/publish`,{method:'POST'}),onSuccess:data=>{remember('golmok-store',data.store_id);remember('golmok-session','');onPublished(data.store_id)}})
  function resetSession() { setEntryIntroductionDone(false);setGreetedSession(null);remember('golmok-session-intro','');setVoiceEnabled(true);started.current=false;setSessionId(null);reset(null);setDone(false);remember('golmok-session','');start.reset();send.reset();confirm.reset() }
  function restartRegistration() { resetSession(); navigate('/merchant/register', { state: { voice: true } }) }
  // 현재 단계만 다시 받는다. 앞 단계의 답변은 기존 서버 세션에 그대로 둔다.
  const active = question || (sessionId && summary.isFetchedAfterMount && summary.data && {step:summary.data.step,question_ko:fallbackQuestions[summary.data.step]})
  const resuming = !question && active && active.step !== STEPS[0] && !summary.data?.done
  const intro = !entryIntroductionDone && sessionId && active && !summary.data?.done
    ? resuming ? `이어서 할게요. ${STEPS.indexOf(active.step) + 1}번째 질문이에요.`
      : active.step === STEPS[0] && greetedSession !== sessionId ? INTRODUCTION : ''
    : ''
  function onIntroDone() {
    setEntryIntroductionDone(true)
    if (active?.step === STEPS[0]) { setGreetedSession(sessionId); remember('golmok-session-intro',sessionId) }
  }
  if (!review && (done || (!question && summary.isFetchedAfterMount && summary.data?.done))) return <Navigate to="/merchant/review" replace/>
  if (review && !sessionId) return <div className="mobile-page host-page"><PageHeader title="AI 정리 결과" back="/merchant" showLanguage={false}/><p>가게 등록을 먼저 시작해주세요.</p><Button to="/merchant/register" primary>말로 가게 등록하기</Button></div>
  if (review) return <HostReviewPage summary={summary} sessionId={sessionId} publish={publish} store={store} onRestart={restartRegistration}/>
  return <HostRegistrationPage flow={{active,summary,answer,input,setInput,manualInput,setManualInput,capturing,setCapturing,voiceEnabled,setVoiceEnabled,send,confirm,start,submit,acceptAnswer,resetSession,sent,sessionId,intro,onIntroDone,replayQuestion:()=>{spoken.current?.();spoken.current=speakQuestion(active?.question_ko || fallbackQuestions.store_name,()=>{})}}}/>
}
