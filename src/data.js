import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from './api'
export const Language = createContext('en')
export const LanguageSettings = createContext(() => {})
export const text = {
  ko: ['시장 탐색', '시장 숏폼', 'K-콘텐츠', '사장님', '골목마다, 새로운 맛.', '영상으로 먼저 만나고, 시장에서 맛보세요.', '오늘은 어느 시장으로 갈까요?', '시장 이름이나 주소 검색', '가게', '메뉴', '주문 카드 만들기', '사장님께 이 화면을 보여주세요', '길찾기'],
  en: ['Explore', 'Shorts', 'K-content', 'Merchants', 'Every alley, a new flavor.', 'Discover the stories. Taste the market.', 'Where will you explore today?', 'Search markets or addresses', 'Stores', 'Menu', 'Create order card', 'Show this screen to the merchant', 'Directions'],
  zh: ['探索市场', '短视频', '韩国影视', '商家入口', '每条小巷，都有新滋味。', '先看视频，再去市场品尝。', '今天想去哪个市场？', '搜索市场或地址', '店铺', '菜单', '生成点餐卡', '请向店主出示此页面', '导航'],
}
export function useApi(path, enabled = true) {
  const lang = useContext(Language)
  return useQuery({ queryKey: [path, lang], enabled, queryFn: ({ signal }) => api(`${path}${path.includes('?') ? '&' : '?'}lang=${lang}`, { signal }) })
}

