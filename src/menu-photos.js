const photos = import.meta.glob('./assets/foods/*.jpg', { eager: true, query: '?url', import: 'default' })
const names = {
  김밥: 'gimbap', 라면: 'ramyeon', 국밥: 'gukbap', 순대국밥: 'gukbap',
  비빔밥: 'bibimbap', 나물: 'namul', 나물반찬: 'namul', 달고나: 'dalgona',
  라볶이: 'rabokki', 떡볶이: 'tteokbokki', 순대: 'sundae', 꽈배기: 'kkwabaegi', 호떡: 'hotteok',
  기름떡볶이: 'oil-tteokbokki', 간장떡볶이: 'oil-tteokbokki', 어묵: 'eomuk',
  찹쌀도넛: 'chapssal-doughnuts', 식혜: 'sikhye', 모둠튀김: 'twigim', 빈대떡: 'bindaetteok', 고기완자: 'wanja',
}

// API 사진이 없을 때만 쓰는 음식 참고 사진. 임의의 메뉴 순번으로 매칭하지 않는다.
export function menuPhoto(menu) {
  const name = (menu?.name_ko || menu?.food_ko || '').replace(/\s/g, '')
  return photos[`./assets/foods/${names[name]}.jpg`]
}

export function marketPhoto(market) {
  const name = market?.name_ko || ''
  return name.includes('영천') ? menuPhoto({ name_ko: '기름떡볶이' })
    : name.includes('포방터') ? menuPhoto({ name_ko: '떡볶이' }) : undefined
}
