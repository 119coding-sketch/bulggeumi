import axios from 'axios'
import { resolveStationCenter, STATION_TO_GU, GU_SEARCH_PARAMS } from '../utils/stationUtils'

// 스마트서울맵 테마 API — 보이는소화기함 (theme_id: 11103379)
const THEME_KEY = import.meta.env.VITE_THEME_API_KEY
const THEME_ID = '11103379'

// 개발: Vite 프록시 /api/seoulProxy → map.seoul.go.kr
// 배포: Vercel 서버리스 함수 api/seoulProxy.js
const themeApi = axios.create({
  baseURL: '/api/seoulProxy',
  timeout: 20000,
})

const CACHE_TTL = 30 * 60 * 1000 // 30분

function extractGu(address) {
  if (!address) return ''
  const parts = address.split(' ')
  const candidate = parts[1] ?? ''
  return (candidate.endsWith('구') || candidate.endsWith('군')) ? candidate : ''
}

function mapThemeItem(item) {
  const address = item.COT_ADDR_FULL_NEW || item.COT_ADDR_FULL_OLD || ''
  const { station, center } = resolveStationCenter(item.COT_CONTS_ID)
  return {
    id: item.COT_CONTS_ID,
    lat: item.COT_COORD_Y,
    lng: item.COT_COORD_X,
    name: item.COT_CONTS_NAME || '보이는 소화기',
    address,
    gu: extractGu(address),
    station,
    center,
    type: '분말 ABC형',
    capacity: '',
    installedAt: item.COT_REG_DATE ? item.COT_REG_DATE.split(' ')[0] : '',
    status: item.COT_CONTS_STAT === '1' ? '정상' : '점검필요',
  }
}

async function fetchPage(page_no, coord_x, coord_y, distance) {
  const { data } = await themeApi.get('', {
    params: {
      apiPath: `openapi/v5/${THEME_KEY}/private/themes/contents/ko`,
      theme_id: THEME_ID,
      page_size: 1000,
      page_no,
      search_type: 0,
      coord_x,
      coord_y,
      distance,
      search_name: '',
      content_id: '',
      subcate_id: '',
    },
  })
  if (data?.header?.resultCode !== '200') {
    throw new Error(`서울맵 API 오류: ${data?.header?.resultMessage}`)
  }
  return data
}

/**
 * 특정 소방서 관할 구역의 소화기 목록을 가져옵니다.
 * @param {string} stationName - 소방서명 (예: '종로소방서')
 * @param {(items: object[]) => void} onFirstPage - 1페이지 도착 즉시 호출되는 콜백
 */
export async function fetchExtinguishersByStation(stationName, onFirstPage) {
  const cacheKey = `bulggeumi_${stationName}`

  // sessionStorage 캐시 확인
  try {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      const { data, ts } = JSON.parse(cached)
      if (Date.now() - ts < CACHE_TTL) {
        if (onFirstPage) onFirstPage(data)
        return data
      }
    }
  } catch { /* 무시 */ }

  // 구코드 → 검색 좌표 조회
  const guCode = STATION_TO_GU[stationName]
  const geo = GU_SEARCH_PARAMS[guCode]
  const coord_x = geo?.lng ?? 126.978388
  const coord_y = geo?.lat ?? 37.566610
  const distance = geo?.radius ?? 5000

  // 1페이지 먼저 요청
  const first = await fetchPage(1, coord_x, coord_y, distance)
  const h = first.header ?? {}
  const totalPages = parseInt(h.PAGE_COUNT ?? h.page_count ?? 1, 10)
  const firstItems = (Array.isArray(first.body) ? first.body : []).map(mapThemeItem)

  // 1페이지 데이터 즉시 화면에 반영
  if (onFirstPage) onFirstPage(firstItems)

  // 나머지 페이지 병렬 요청
  let restItems = []
  if (totalPages > 1) {
    const results = await Promise.allSettled(
      Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2, coord_x, coord_y, distance))
    )
    restItems = results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => Array.isArray(r.value.body) ? r.value.body.map(mapThemeItem) : [])
  }

  const all = [...firstItems, ...restItems]

  // 캐시 저장 (소방서별)
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ data: all, ts: Date.now() }))
  } catch { /* 무시 */ }

  return all
}

export async function fetchExtinguisherDetail(id) {
  // id에서 소방서명을 파싱해 해당 구역 데이터만 조회
  const { station } = resolveStationCenter(id)
  if (station) {
    const items = await fetchExtinguishersByStation(station)
    const found = items.find((item) => String(item.id) === String(id))
    if (found) return found
  }
  return null
}

export async function submitReport(payload) {
  console.warn('[불끄미] 신고 제출 시뮬레이션:', payload)
  return { ok: true, id: Date.now() }
}
