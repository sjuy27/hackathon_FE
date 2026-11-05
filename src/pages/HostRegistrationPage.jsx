import { Button, FilterChips, PageHeader } from '../components/MobileUI'
import { NavIcon } from '../Profile'
import SpeechAnswer, { VoiceConfirmation } from '../components/host/SpeechAnswer'
import { NeedsCheck } from '../components/host/OnboardingFields'
import { STEPS, fallbackQuestions, stepLines } from '../components/host/host-model'
import { ErrorMessage, State } from '../shared'

export default function HostRegistrationPage({ flow }) {
  const { active,summary,answer,edits,input,setInput,manualInput,setManualInput,capturing,setCapturing,voiceEnabled,setVoiceEnabled,send,confirm,start,submit,acceptAnswer,resetSession,sent,sessionId } = flow
  const step = active?.step || 'store_name', index = Math.max(0,STEPS.indexOf(step)), busy = send.isPending || confirm.isPending
  const names = ['가게 이름','메뉴·가격','결제 방법','영업시간','가게 이야기']
  return <div className="mobile-page host-page host-registration-page" lang="ko"><PageHeader title="말로 가게 등록하기" back="/merchant" showLanguage={false} end={<span className="host-step-count">{index+1} / 5</span>}/><FilterChips label="등록 단계" options={STEPS.map((key,i) => [key,`${names[i]}${i < index ? ' ✓' : ''}`])} value={step} disabledKeys={STEPS.filter(key => key !== step)}/>
    {!active && sessionId ? <State query={summary}/> : <>
      <div className="host-question-card"><h2>{active?.question_ko || fallbackQuestions[step]}</h2>{active?.example_ko && <p>예: {active.example_ko}</p>}<button type="button" onClick={flow.replayQuestion}><NavIcon type="sound"/>다시 듣기</button></div>
      {(sent || answer?.transcript) && <p className="host-answer-bubble">{answer?.transcript || sent}</p>}
      {send.isPending && <p className="host-muted" role="status">정리하고 있어요…</p>}
      {answer && <div className="host-confirm-card"><h2>{answer.confirm_text_ko || '이렇게 정리했어요. 맞나요?'}</h2><dl className="host-answer-values">{(answer.step === 'menus' ? (edits.menus || []).map(menu => [menu.name_ko,menu.price == null ? '가격 확인 필요' : `${Number(menu.price).toLocaleString('ko-KR')}원`]) : stepLines(answer.step,edits).map(line => ['',line])).map(([label,value],i) => <div key={i}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><NeedsCheck items={answer.needs_check} step={answer.step}/><div className="host-confirm-actions"><Button disabled={busy} onClick={() => acceptAnswer(false)}>다시 말할게요</Button><Button primary disabled={busy} onClick={() => acceptAnswer(true)}>맞아요</Button></div></div>}
      {!answer && !send.isPending ? <form onSubmit={event => { event.preventDefault(); if (manualInput && !capturing) submit({text:input}) }}><SpeechAnswer presentation="host" prompt={active?.question_ko || fallbackQuestions[step]} autoStart={voiceEnabled && !send.isError} disabled={busy || start.isPending || !sessionId} onEnableVoice={() => setVoiceEnabled(true)} value={input} onChange={setInput} onAutoSubmit={text => submit({text})} onAudio={audio => submit({audio})} onManualInput={() => setManualInput(true)} onRecordingChange={value => { setCapturing(value); if(value)setManualInput(false) }}/>{manualInput && !capturing && input.trim() && <Button type="submit" primary disabled={busy}>답변 보내기</Button>}</form> : answer && <VoiceConfirmation prompt={answer.confirm_text_ko} enabled={voiceEnabled && !busy} onConfirm={acceptAnswer}/>}
    </>}
    <div className="host-inline-errors"><ErrorMessage error={start.error}/><ErrorMessage error={send.error}/><ErrorMessage error={confirm.error}/>{start.isError && <Button onClick={() => start.mutate()}>다시 시작</Button>}{summary.isError && <Button onClick={() => summary.refetch()}>등록 내용 다시 불러오기</Button>}</div>
    {(start.isError || summary.isError) && <Button disabled={busy || start.isPending} onClick={resetSession}>처음부터 새로 등록</Button>}
  </div>
}
