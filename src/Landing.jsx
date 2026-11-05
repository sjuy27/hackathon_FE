import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { Language } from './data'
import { LanguageSelect } from './Profile'
import RoleIcon from './RoleIcon'

const labels = {
  en: { title: <>Every alley,<br/>a new flavor.</>, intro: "Watch short videos from Seoul's traditional markets, then order in Korean with one tap.", preview: 'Market short-form preview', explore: 'Start exploring', guest: 'Continue as guest · no sign-up', host: '사장님으로 시작', merchant: 'Host' },
  ko: { title: <>골목마다,<br/>새로운 맛.</>, intro: '서울 전통시장의 짧은 영상을 만나고, 터치 한 번으로 한국어 주문 카드를 만들어보세요.', preview: '시장 숏폼 미리보기', explore: '시장 둘러보기', guest: '게스트로 시작 · 가입 없이 이용', host: '사장님으로 시작', merchant: 'Host' },
  zh: { title: <>每条小巷，<br/>都有新滋味。</>, intro: '观看首尔传统市场的短视频，一键生成韩语点餐卡。', preview: '市场短视频预览', explore: '开始探索', guest: '以访客身份继续 · 无需注册', host: '商家入口', merchant: 'Host' },
}

export default function Landing() {
  const t = labels[useContext(Language)]
  return <div className="landing-page">
    <div className="landing-brand-row"><Link to="/" className="landing-brand" aria-label="골목 홈">골목 <span>GOLMOK</span></Link><LanguageSelect/></div>
    <div className="landing-body">
      <Link to="/guest" className="landing-preview" aria-label={t.preview}><span className="preview-phone"><RoleIcon name="play"/></span><span>{t.preview}</span></Link>
      <h1>{t.title}</h1><p>{t.intro}</p>
    </div>
    <div className="landing-actions">
      <Link className="role-button primary guest-entry" to="/guest"><strong>{t.explore}</strong><small>{t.guest}</small></Link>
      <Link className="role-button host-entry" to="/host"><RoleIcon name="shop"/><strong>{t.host}</strong><small>· {t.merchant}</small></Link>
    </div>
  </div>
}
