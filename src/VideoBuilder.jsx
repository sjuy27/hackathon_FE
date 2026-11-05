import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './api'
import { useApi } from './data'
import { ErrorMessage, State, VideoPlayer } from './shared'
import { remember, saved } from './merchant-storage'
import AudioInput from './AudioInput'

export default function VideoBuilder({ storeId }) {
  const [photos, setPhotos] = useState([]), [audio, setAudio] = useState(null), [script, setScript] = useState('')
  const [langs, setLangs] = useState(['en', 'zh']), [menu, setMenu] = useState(''), [jobId, setJobId] = useState(() => saved(`golmok-job-${storeId}`))
  const store = useApi(`/stores/${storeId}`)
  const create = useMutation({ mutationFn: () => {
    if (photos.length < 1 || photos.length > 5) throw new Error('사진을 1~5장 선택해주세요.')
    if (photos.some(photo => !photo.type.startsWith('image/'))) throw new Error('이미지 파일을 선택해주세요.')
    if (audio?.size > 10 * 1024 * 1024) throw new Error('음성 파일은 10MB 이하로 선택해주세요.')
    const body = new FormData()
    photos.forEach(photo => body.append('photos', photo))
    if (script.trim()) body.append('script', script.trim())
    else if (audio) body.append('audio', audio)
    if (menu) body.append('menu_id', menu)
    langs.forEach(lang => body.append('langs', lang))
    return api(`/merchant/stores/${storeId}/videos`, { method: 'POST', body })
  }, onSuccess: data => { setJobId(data.job_id); remember(`golmok-job-${storeId}`, data.job_id) } })
  const job = useQuery({ queryKey: ['video-job', jobId], enabled: !!jobId, queryFn: () => api(`/merchant/videos/jobs/${jobId}`), refetchInterval: query => query.state.status === 'error' ? false : !query.state.data || ['queued', 'processing'].includes(query.state.data.status) ? 2000 : false })
  const result = useApi(`/videos/${job.data?.video_id}`, !!job.data?.video_id && job.data?.status === 'done')
  const busy = create.isPending || (!!jobId && (!job.data || ['queued', 'processing'].includes(job.data.status)))
  return <section className="panel video-builder">
    <form id="create-video" onSubmit={event => { event.preventDefault(); create.mutate() }}>
      <label className="video-menu">어떤 메뉴 영상인가요?<select value={menu} disabled={busy} onChange={event => setMenu(event.target.value)}><option value="">가게 전체 소개</option>{store.data?.menus.map(item => <option key={item.menu_id} value={item.menu_id}>{item.name_ko || item.name}</option>)}</select></label>
      <h2>1. 사진 고르기 <small>1~5장</small></h2>
      <div className="photo-slots">{photos.length ? photos.map((photo, index) => <div className="photo-slot" key={`${photo.name}-${index}`}>{photo.name}</div>) : <><span className="photo-slot">사진</span><span className="photo-slot">사진</span></>}<label className="photo-add">＋<input type="file" accept="image/*" multiple disabled={busy} aria-label="영상에 사용할 사진 1~5장 선택" onChange={event => setPhotos(Array.from(event.target.files))}/></label></div>
      {photos.length > 5 && <p className="error" role="alert">사진은 최대 5장까지 선택할 수 있어요.</p>}
      <p className="small">한 장만 있어도 확대 → 이동 → 축소로 나눠 보여줘요</p>
      <h2><label htmlFor="video-script">2. 영상에 넣을 말</label></h2>
      <textarea id="video-script" value={script} maxLength={1000} disabled={busy || !!audio} onChange={event => setScript(event.target.value)} placeholder="예: 매일 아침 직접 만든 양념으로 볶는 기름떡볶이예요."/>
      <AudioInput onChange={setAudio} disabled={busy || !!script.trim()} compact/>
      {audio && <p className="small">{audio.name} <button type="button" disabled={busy} onClick={() => setAudio(null)}>음성 취소</button></p>}
      <p className="small">쓴 글은 그대로 자막이 돼요. 녹음은 있으면 받아 적고, 둘 다 없으면 가게 정보로 만들어요.</p>
      <div className="video-preview-grid"><div className="video-placeholder" aria-label="영상 미리보기 자리"><span>미리보기</span><span>{langs.join(' · ').toUpperCase()} · 자막</span></div><div><div className="video-explanation"><strong>우리 가게의 짧은 이야기</strong><p>영상이 완성되면 미리보기와 길이를 확인할 수 있어요.</p></div><fieldset disabled={busy}><legend>자막 언어</legend>{[['ko', '한국어'], ['en', '영어'], ['zh', '중국어']].map(([code, label]) => <label className="checkbox" key={code}><input type="checkbox" checked={langs.includes(code)} onChange={event => setLangs(previous => event.target.checked ? [...previous, code] : previous.filter(lang => lang !== code))}/>{label}</label>)}</fieldset></div></div>
      <p className="small">ⓘ 손님 얼굴이 나오면 꼭 동의를 받아 주세요</p>
      <ErrorMessage error={create.error}/>
    </form>
    <div className="host-video-action"><button className="role-button primary" type="submit" form="create-video" disabled={busy || photos.length < 1 || photos.length > 5 || !langs.length}>{create.isPending ? '요청 중…' : busy ? '영상 생성 중…' : '영상 만들기'}</button></div>
    {jobId && <State query={job}><div className="notice" aria-live="polite"><h3>{({ queued: '생성 대기 중', processing: '영상을 만들고 있어요', done: '영상이 완성되었어요!', failed: '영상 생성에 실패했어요' })[job.data?.status]}</h3><progress value={job.data?.progress || 0} max="100" aria-label="영상 생성 진행률"/><p>{job.data?.progress || 0}%</p>{job.data?.error && <p className="error">{job.data.error}</p>}{job.data?.status === 'failed' && <button onClick={() => { setJobId(null); remember(`golmok-job-${storeId}`, '') }}>다시 만들기</button>}</div></State>}
    {job.data?.status === 'done' && <State query={result}>{result.data && <VideoPlayer video={result.data}/>}</State>}
  </section>
}
