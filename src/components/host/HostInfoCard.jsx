import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../api'
import { ErrorMessage } from '../../shared'
import { Button } from '../MobileUI'
import { StepFields } from './OnboardingFields'
import { stepLines, stepNames } from './host-model'

export default function HostInfoCard({ step, value, sessionId, warning, onSaved }) {
  const [editing,setEditing] = useState(false), [edits,setEdits] = useState(value)
  const save = useMutation({ mutationFn: () => api(`/merchant/onboarding/sessions/${sessionId}/confirm`,{ method:'POST', body:{ step,accepted:true,edits } }), onSuccess: async () => { await onSaved(); setEditing(false) } })
  return <section className={`host-info-card ${warning ? 'warning' : ''}`}><div className="host-info-head"><div><h2>{stepNames[step]}{warning && <span>확인 필요</span>}</h2><p className="host-info-value">{stepLines(step,value).join('\n')}</p></div><Button aria-expanded={editing} onClick={() => setEditing(open => !open)}>{warning ? '답하기' : '고치기'}</Button></div>{editing && <form className="host-fields" onSubmit={event => { event.preventDefault(); save.mutate() }}><StepFields step={step} value={edits} onChange={setEdits}/><Button type="submit" primary disabled={save.isPending}>수정 내용 저장</Button><ErrorMessage error={save.error}/></form>}</section>
}
