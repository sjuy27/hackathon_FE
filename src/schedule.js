// The API currently returns Korean schedule text even with lang=en/zh.
// Translate known schedule vocabulary without changing dates or inventing hours.
const days = [
  ['월요일','Monday','星期一'],['화요일','Tuesday','星期二'],['수요일','Wednesday','星期三'],
  ['목요일','Thursday','星期四'],['금요일','Friday','星期五'],['토요일','Saturday','星期六'],['일요일','Sunday','星期日'],
]
const terms = [
  ['연중무휴','Open all year','全年无休'],['상설시장','Permanent market','常设市场'],['상설','Permanent market','常设市场'],
  ['매일','Daily','每天'],['매주','Every','每'],['매월','Every month','每月'],['평일','Weekdays','工作日'],['주말','Weekends','周末'],
  ['공휴일','Public holidays','法定节假日'],['정기휴무','Closed','定期休息'],['휴무일','Closed','休息日'],['휴무','Closed','休息'],
  ['휴일','Holidays','节假日'],['영업시간','Opening hours','营业时间'],['영업','Open','营业'],['휴게시간','Break','休息时间'],
  ['브레이크타임','Break','休息时间'],['브레이크 타임','Break','休息时间'],['라스트오더','Last order','最后点单'],['마지막 주문','Last order','最后点单'],
  ['첫째','1st','第一'],['둘째','2nd','第二'],['셋째','3rd','第三'],['넷째','4th','第四'],['다섯째','5th','第五'],
  ['장날','Market days','集市日'],['비정기','Irregular','不定期'],['정기','Regular','定期'],['쉬는 날','Closed','休息日'],
  ['오전','AM','上午'],['오후','PM','下午'],
]

export function localizeSchedule(value, lang) {
  if (typeof value !== 'string' || !['en','zh'].includes(lang) || !/[가-힣]/.test(value)) return value
  const column = lang === 'zh' ? 2 : 1
  let result = value.replace(/(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(반)|\s*(\d{1,2})\s*분)?/g,(match,period,hour,half,minute) => {
    let h = Number(hour), m = half ? 30 : Number(minute || 0)
    if (h > 24 || m > 59 || (period && (h < 1 || h > 12))) return match
    if (period === '오후' && h < 12) h += 12
    if (period === '오전' && h === 12) h = 0
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  })
  result = result.replace(/(?:매주\s*)?(월요일|화요일|수요일|목요일|금요일|토요일|일요일)\s*(?:정기\s*)?휴무/g,(_,day) => {
    const entry = days.find(item => item[0] === day)
    return lang === 'en' ? `Closed on ${entry[1]}s` : `${entry[2]}休息`
  })
  for (const [ko,en,zh] of days) {
    result = result.replaceAll(`${ko} 휴무`,lang === 'en' ? `Closed on ${en}s` : `${zh}休息`)
    result = result.replaceAll(ko,lang === 'en' ? en : zh)
  }
  for (const entry of terms) result = result.replaceAll(entry[0],entry[column])
  // Unknown free-form Korean needs a real translation, rather than guessed hours.
  return /[가-힣]/.test(result) ? (lang === 'en' ? 'Contact the shop for opening hours' : '营业时间请咨询店铺') : result
}

export function localizeSchedules(data,lang) {
  if (!['en','zh'].includes(lang) || data == null || typeof data !== 'object') return data
  if (Array.isArray(data)) return data.map(item => localizeSchedules(item,lang))
  return Object.fromEntries(Object.entries(data).map(([key,value]) => [key,['hours','open_cycle'].includes(key) ? localizeSchedule(value,lang) : localizeSchedules(value,lang)]))
}
