import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api'
import { saved, STEPS } from './host-model'

const fields = ['가게 이름', '메뉴', '결제 방법', '영업시간', '가게 이야기']

export default function useStoreProgress(store) {
  const [sessionId] = useState(() => saved('golmok-session'))
  const summary = useQuery({ queryKey: ['onboarding-summary', sessionId], enabled: !!sessionId, queryFn: () => api(`/merchant/onboarding/sessions/${sessionId}/summary`) })
  const values = [store.name_ko || store.name, store.menus?.length, store.payment?.length, store.hours, store.story_ko || store.story]
  const completed = summary.data ? STEPS.filter(step => summary.data.steps?.[step]).length : values.filter(Boolean).length
  const missing = summary.data ? fields.filter((_, index) => !summary.data.steps?.[STEPS[index]]) : fields.filter((_, index) => !values[index])
  return { completed: Math.min(completed, STEPS.length), missing }
}
