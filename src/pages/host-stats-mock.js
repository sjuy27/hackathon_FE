// 실제 집계가 아닌 발표용 예시. 메뉴 이름은 화면에서 가게 데이터로 연결한다.
export const hostStatsMock = {
  today: {
    foreignViews: 148, orders: 12, videoViews: 420, directions: 28,
    changes: { foreignViews: 12.5, orders: -7.7, videoViews: 18.2, directions: 16.7 },
    traffic: { shorts: 64, contents: 23, map: 13 },
    languages: { en: 72, zh: 28 },
    menuOrders: [7, 3, 2],
  },
  week: {
    foreignViews: 1080, orders: 126, videoViews: 3250, directions: 284,
    changes: { foreignViews: 18.4, orders: 12.5, videoViews: 24.1, directions: 9.2 },
    traffic: { shorts: 61, contents: 25, map: 14 },
    languages: { en: 68, zh: 32 },
    menuOrders: [58, 41, 27],
  },
  month: {
    foreignViews: 4820, orders: 532, videoViews: 14600, directions: 1250,
    changes: { foreignViews: 21.6, orders: 16.2, videoViews: 28.3, directions: 13.8 },
    traffic: { shorts: 58, contents: 27, map: 15 },
    languages: { en: 65, zh: 35 },
    menuOrders: [240, 177, 115],
  },
}
