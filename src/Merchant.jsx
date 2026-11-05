import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useApi } from './data'
import { State } from './shared'
import { DEMO_STORE_ID, readRole } from './auth'
import { saved } from './components/host/host-model'
import { PageHeader } from './components/MobileUI'
import OnboardingFlow from './components/host/OnboardingFlow'
import EditStore from './components/host/EditStore'
import HostHomePage from './pages/HostHomePage'
import HostVideoPage from './pages/HostVideoPage'
import HostProfilePage from './pages/HostProfilePage'

export function Merchant() {
  const param=useParams()['*'],tab=param||'home',navigate=useNavigate(),client=useQueryClient()
  const [storeId,setStoreId]=useState(()=>saved('golmok-store')||DEMO_STORE_ID)
  const allowed=readRole()==='merchant',store=useApi(`/stores/${storeId}`,allowed)
  async function published(id){setStoreId(id);await client.invalidateQueries({queryKey:[`/stores/${id}`]});navigate('/merchant/video')}
  if(!allowed)return <Navigate to="/merchant/login" replace/>
  if(!['home','register','review','video','edit','stats','profile'].includes(tab))return <Navigate to="/merchant" replace/>
  return <State query={store}>{store.data&&(tab==='home'?<HostHomePage store={store.data}/>:tab==='stats'?<HostHomePage store={store.data} statistics/>:tab==='profile'?<HostProfilePage store={store.data}/>:tab==='register'||tab==='review'?<OnboardingFlow key={storeId} store={store.data} onPublished={published} review={tab==='review'}/>:tab==='video'?<HostVideoPage key={storeId} store={store.data}/>:<div className="mobile-page host-page host-edit-page" lang="ko"><PageHeader title="가게 정보" back="/merchant" showLanguage={false}/><EditStore store={store.data}/></div>)}</State>
}
