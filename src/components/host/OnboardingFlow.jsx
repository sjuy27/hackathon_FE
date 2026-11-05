import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../api'
import { speakQuestion } from '../../merchant-voice'
import { saved, remember, fallbackQuestions } from './host-model'
import HostRegistrationPage from '../../pages/HostRegistrationPage'
import HostReviewPage from '../../pages/HostReviewPage'
import { Button, PageHeader } from '../MobileUI'

export default function OnboardingFlow({ store, onPublished, review = false }) {
  const [sessionId,setSessionId] = useState(() => saved('golmok-session')), [question,setQuestion] = useState(null), [answer,setAnswer] = useState(null), [edits,setEdits] = useState({}), [input,setInput] = useState(''), [manualInput,setManualInput] = useState(false), [capturing,setCapturing] = useState(false), [sent,setSent] = useState(''), [done,setDone] = useState(false), [voiceEnabled,setVoiceEnabled] = useState(false)
  const sending = useRef(false), confirming = useRef(false), started = useRef(false), spoken = useRef(null)
  const summary = useQuery({ queryKey:['onboarding-summary',sessionId], enabled:!!sessionId, queryFn: () => api(`/merchant/onboarding/sessions/${sessionId}/summary`), refetchInterval: query => query.state.data?.preview_en?.translated === false ? 1500 : false })
  function reset(data) { setQuestion(data); setAnswer(null); setInput(''); setManualInput(false); setCapturing(false); setSent(''); confirming.current = false }
  const start = useMutation({ mutationFn: () => api('/merchant/onboarding/sessions',{method:'POST',body:{store_id:store.store_id}}), onSuccess: data => { setSessionId(data.session_id); remember('golmok-session',data.session_id); reset(data); setDone(false) } })
  const startSession = start.mutate
  useEffect(() => { if(!sessionId && !review && !started.current) { started.current = true; startSession() } },[sessionId,review,startSession])
  useEffect(() => () => spoken.current?.(),[])
  const send = useMutation({ mutationFn: ({text,audio}) => { if(audio?.size > 10*1024*1024)throw new Error('음성 파일은 10MB 이하로 보내주세요.'); const body = new FormData(); if(text?.trim())body.append('text',text.trim()); else body.append('audio',audio,'blob'); return api(`/merchant/onboarding/sessions/${sessionId}/answers`,{method:'POST',body}) },onSuccess:data => {setAnswer(data);setEdits(data.parsed)},onSettled:()=>{sending.current=false} })
  function submit(payload) { if(!sessionId || sending.current || (!payload.text?.trim() && !payload.audio))return; sending.current = true;setSent(payload.text?.trim() || '(녹음한 답변)');setManualInput(false);send.mutate(payload) }
  const confirm = useMutation({ mutationFn: accepted => api(`/merchant/onboarding/sessions/${sessionId}/confirm`,{method:'POST',body:{step:answer.step,accepted,...(accepted?{edits}:{})}}),onSuccess: async data => {reset(data);setDone(data.done);await summary.refetch()},onSettled:()=>{confirming.current=false} })
  function acceptAnswer(accepted) {if(confirming.current || !answer)return;confirming.current=true;confirm.mutate(accepted)}
  const publish = useMutation({mutationFn:()=>api(`/merchant/onboarding/sessions/${sessionId}/publish`,{method:'POST'}),onSuccess:data=>{remember('golmok-store',data.store_id);remember('golmok-session','');onPublished(data.store_id)}})
  function resetSession() { started.current=false;setSessionId(null);reset(null);setDone(false);remember('golmok-session','');start.reset();send.reset();confirm.reset() }
  const active = question || (summary.data && {step:summary.data.step,question_ko:fallbackQuestions[summary.data.step]})
  if (!review && (done || (!question && summary.data?.done))) return <Navigate to="/merchant/review" replace/>
  if (review && !sessionId) return <div className="mobile-page host-page"><PageHeader title="AI 정리 결과" back="/merchant" showLanguage={false}/><p>가게 등록을 먼저 시작해주세요.</p><Button to="/merchant/register" primary>말로 가게 등록하기</Button></div>
  if (review) return <HostReviewPage summary={summary} sessionId={sessionId} publish={publish} store={store}/>
  return <HostRegistrationPage flow={{active,summary,answer,edits,setEdits,input,setInput,manualInput,setManualInput,capturing,setCapturing,voiceEnabled,setVoiceEnabled,send,confirm,start,submit,acceptAnswer,resetSession,sent,sessionId,replayQuestion:()=>{spoken.current?.();spoken.current=speakQuestion(active?.question_ko || fallbackQuestions.store_name,()=>{})}}}/>
}
