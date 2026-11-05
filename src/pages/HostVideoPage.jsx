import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { speakQuestion } from '../merchant-voice'
import { ErrorMessage, State, VideoPlayer } from '../shared'
import { NavIcon } from '../Profile'
import { Button, FilterChips, MediaSlot, PageHeader } from '../components/MobileUI'
import SpeechAnswer from '../components/host/SpeechAnswer'

function scriptLines(script) { return script.split(/\n|(?<=[.!?。！？])\s+/).map(line=>line.trim()).filter(Boolean).length }
const previewLanguages = [['en','EN'],['zh','中文'],['ko','한국어']]
export default function HostVideoPage({ store }) {
  const storeId = store.store_id
  const [photos,setPhotos] = useState([]), [script,setScript] = useState(''), [audio,setAudio] = useState(null), [langs,setLangs] = useState(['en','zh']), [menu,setMenu] = useState(''), [jobId,setJobId] = useState(null), [slow,setSlow] = useState(false), [capturing,setCapturing] = useState(false), [message,setMessage] = useState('')
  const [previewLang, setPreviewLang] = useState('en')
  const urls = useRef(new Set()), creating = useRef(false), spoken = useRef(null), scriptBox = useRef(null)
  // 이전 버전에서 저장한 미리보기 작업은 다시 열지 않는다(사장님 화면을 다시 열면 영상 만들기를 처음부터).
  useEffect(()=>{try{localStorage.removeItem(`golmok-job-${storeId}`)}catch{/* Optional storage. */}},[storeId])
  useEffect(()=>{const ownedUrls=urls.current;return()=>{ownedUrls.forEach(url=>URL.revokeObjectURL(url));spoken.current?.()}},[])
  const create = useMutation({mutationFn:(payload={})=>{
    if(photos.length<1 || photos.length>5)throw new Error('사진을 1~5장 선택해주세요.')
    const body = new FormData(), recording=payload.audio??(payload.text==null?audio:null), text=payload.text??script
    if(recording?.size>10*1024*1024)throw new Error('녹음 파일은 10MB 이하로 보내주세요.')
    photos.forEach(photo=>body.append('photos',photo.file))
    if(recording)body.append('audio',recording,'blob');else if(text.trim())body.append('script',text.trim())
    if(menu)body.append('menu_id',menu)
    langs.forEach(lang=>body.append('langs',lang))
    return api(`/merchant/stores/${storeId}/videos`,{method:'POST',body})
  },onSuccess:data=>{setSlow(false);setJobId(data.job_id)},onSettled:()=>{creating.current=false}})
  const job = useQuery({queryKey:['video-job',jobId],enabled:!!jobId,queryFn:()=>api(`/merchant/videos/jobs/${jobId}`),refetchInterval:query=>query.state.status==='error'?false:!query.state.data||['queued','processing'].includes(query.state.data.status)?2000:false})
  const status=job.data?.status,busy=create.isPending||!!jobId&&(!job.data||['queued','processing'].includes(status))
  useEffect(()=>{if(!busy)return;const timer=setTimeout(()=>setSlow(true),30000);return()=>clearTimeout(timer)},[busy,jobId])
  const fallbackId=status==='failed'?job.data.fallback_video_id:busy&&slow?store.videos[0]?.video_id:null
  const result=useQuery({queryKey:[`/videos/${job.data?.video_id}`,'en'],enabled:status==='done'&&!!job.data?.video_id,queryFn:({signal})=>api(`/videos/${job.data.video_id}?lang=en`,{signal})})
  const fallback=useQuery({queryKey:[`/videos/${fallbackId}`,'en'],enabled:!!fallbackId,queryFn:({signal})=>api(`/videos/${fallbackId}?lang=en`,{signal})})
  const preview = status === 'done' ? result : fallbackId ? fallback : null
  const availableLanguages = previewLanguages.filter(([code]) => preview?.data?.video_urls?.[code])
  function generate(payload={}) {if(creating.current||busy||capturing)return;creating.current=true;create.mutate(payload)}
  function finishScript(payload) {setCapturing(false);setScript(payload.text||'');setAudio(payload.audio||null);setMessage(payload.audio?'녹음한 설명이 준비됐어요.':'');if(photos.length>=1&&photos.length<=5){if(!creating.current&&!busy){creating.current=true;create.mutate(payload)}}else spoken.current=speakQuestion('설명이 준비됐어요. 사진을 선택한 다음 영상 만들기를 눌러 주세요.',()=>{})}
  function addPhotos(event) {
    const files=Array.from(event.target.files||[]);event.target.value=''
    if(!files.length)return
    if(photos.length+files.length>5){setMessage('사진은 최대 5장까지 선택해주세요.');return}
    if(files.some(file=>!file.type.startsWith('image/'))){setMessage('이미지 파일을 선택해주세요.');return}
    const additions=files.map(file=>{const url=URL.createObjectURL(file);urls.current.add(url);return{file,url}})
    setMessage('');setPhotos(previous=>[...previous,...additions])
  }
  function removePhoto(url) {URL.revokeObjectURL(url);urls.current.delete(url);setPhotos(previous=>previous.filter(photo=>photo.url!==url))}
  function resetJob(){setJobId(null);setSlow(false);create.reset()}
  const lines=scriptLines(script)
  return <div className="mobile-page host-page host-video-page" lang="ko"><PageHeader title="영상 만들기" back="/merchant" showLanguage={false}/><form id="host-create-video" onSubmit={event=>{event.preventDefault();generate()}}>
    <label className="host-video-menu">어떤 메뉴 영상인가요?<select value={menu} disabled={busy} onChange={event=>setMenu(event.target.value)}><option value="">가게 전체 소개</option>{store.menus.map(item=><option key={item.menu_id} value={item.menu_id}>{item.name_ko||item.name}</option>)}</select></label>
    <div className="host-upload-heading"><h2>1. 사진 고르기</h2><span>1~5장</span></div><div className="host-upload-row">{photos.length?photos.map((photo,index)=><div className="host-photo" key={photo.url}><MediaSlot src={photo.url} alt={`선택한 가게 사진 ${index+1}: ${photo.file.name}`}/><button className="host-photo-remove" type="button" disabled={busy} onClick={()=>removePhoto(photo.url)} aria-label={`${photo.file.name} 삭제`}>×</button></div>):[0,1].map(index=><span key={index} className="host-photo-empty"><NavIcon type="photo"/><span>사진</span></span>)}{photos.length<5&&<label className="host-photo-add">＋<input aria-label="가게 사진 선택" type="file" accept="image/*" multiple disabled={busy} onChange={addPhotos}/></label>}</div>
    <h2><label htmlFor="host-video-script">2. 영상에 넣을 말</label></h2><textarea id="host-video-script" ref={scriptBox} value={script} maxLength={1000} disabled={busy||capturing||!!audio} placeholder="매일 아침 직접 만든 양념으로 볶는 기름떡볶이예요." onChange={event=>{setScript(event.target.value);setAudio(null)}}/>
    <SpeechAnswer presentation="compact" value={script} onChange={setScript} prompt="영상으로 소개하고 싶은 가게나 음식 이야기를 30초 안에 말씀해 주세요." maxSeconds={30} maxLength={1000} disabled={busy} onRecordingChange={setCapturing} onAutoSubmit={text=>finishScript({text})} onAudio={recording=>finishScript({audio:recording})}/>
    {audio&&<Button disabled={busy} onClick={()=>{setAudio(null);setMessage('')}}>녹음 취소</Button>}
    <p className="host-video-note">녹음한 음성을 AI가 영상 길이에 맞게 정리해 자막으로 만들어요.</p>
    <div className="host-video-preview" aria-label="영상 미리보기"><MediaSlot src={photos[0]?.url} alt="영상에 사용할 첫 번째 사진" kind="host-preview"/><span>미리보기</span><div className="host-video-play"><NavIcon type="play"/></div><span className="host-video-caption">{langs.map(lang=>lang.toUpperCase()).join(' · ')} · [subtitle]</span></div>
    <div className="host-estimate"><p>예상 길이</p><strong>{lines?`약 ${lines*5}초`:'약 20~30초'}</strong><p>{lines?`자막 ${lines}줄 · 줄당 약 5초`:'가게 정보를 바탕으로 만들어요.'}</p></div>
    <fieldset className="host-subtitle-options" disabled={busy}><legend>자막 언어</legend><div>{[['en','영어'],['zh','중국어'],['ja','일본어']].map(([code,label])=><label key={code}><input type="checkbox" disabled={code==='ja'} checked={langs.includes(code)} onChange={event=>setLangs(previous=>event.target.checked?[...previous,code]:previous.filter(lang=>lang!==code))}/>{label}</label>)}</div></fieldset>
    <p className="host-video-note">ⓘ 손님 얼굴이 나오면 꼭 동의를 받아 주세요.</p>
    {message&&<p className="host-muted" role="status">{message}</p>}<ErrorMessage error={create.error}/>
  </form>
    {jobId&&<State query={job}><div className="notice" aria-live="polite"><h2>{({queued:'생성 대기 중이에요',processing:'영상을 만들고 있어요',done:'영상이 완성되었어요!',failed:'영상 생성에 실패했어요'})[status]}</h2>{busy&&<><progress value={job.data?.progress||0} max="100" aria-label="영상 생성 진행률"/><p>{job.data?.progress||0}%</p></>}{busy&&slow&&<p>시간이 조금 걸려서 기존 영상을 먼저 보여드려요.</p>}{status==='failed'&&<><ErrorMessage error={{message:job.data.error||'다시 시도해주세요.'}}/><Button onClick={()=>{resetJob();if(job.data.error_code==='RECORDING_TOO_LONG'){setAudio(null);scriptBox.current?.focus()}}}>다시 만들기</Button></>}</div></State>}
    {job.isError&&<Button onClick={resetJob}>다시 만들기</Button>}
    {preview&&<State query={preview}>{preview.data&&<div className="host-video-result">{availableLanguages.length>1&&<FilterChips label="영상 언어" options={availableLanguages} value={previewLang} onChange={setPreviewLang}/>}<VideoPlayer video={preview.data} language={previewLang}/></div>}</State>}
    <div className="host-footer"><Button type="submit" form="host-create-video" primary disabled={busy||capturing||!photos.length||photos.length>5}>{busy?'영상 생성 중…':'영상 만들기'}</Button></div>
  </div>
}
