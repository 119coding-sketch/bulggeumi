import axios from 'axios'
import fireStations from '../data/fireStations'

// 스마트서울맵 테마 API — 보이는소화기함 (theme_id: 11103379)
const THEME_KEY = import.meta.env.VITE_THEME_API_KEY
const THEME_ID = '11103379'

// 구코드 → 소방서명 매핑
const GU_TO_STATION = {
  71: '종로소방서', 72: '중부소방서', 73: '광진소방서', 74: '용산소방서',
  75: '동대문소방서', 76: '영등포소방서', 77: '성북소방서', 78: '은평소방서',
  79: '강남소방서', 80: '서초소방서', 81: '강서소방서', 82: '강동소방서',
  83: '마포소방서', 84: '도봉소방서', 85: '구로소방서', 86: '노원소방서',
  87: '관악소방서', 88: '송파소방서', 89: '양천소방서', 90: '중랑소방서',
  91: '동작소방서', 92: '서대문소방서', 93: '강북소방서', 94: '성동소방서',
  95: '금천소방서',
}

/**
 * COT_CONTS_ID를 파싱해 소방서/센터명을 반환합니다.
 * 형식1: "83-251-2021-001234" → 구코드-센터코드-연도-번호
 * 형식2: "공용용-72" 등 → 공용 소화기
 *
 * 센터코드 규칙: 250=현장대응단, 251=두번째센터, 252=세번째... (구코드 무관)
 */
function resolveStationCenter(contsId) {
  if (!contsId) return { station: '', center: '' }

  const parts = String(contsId).split('-')

  // 공용 형식: "공용용-72" 등 (첫 부분이 숫자가 아닌 경우)
  if (isNaN(parseInt(parts[0], 10))) {
    const guCode = parseInt(parts[1], 10)
    const station = GU_TO_STATION[guCode] ?? ''
    return { station, center: '공용' }
  }

  const guCode = parseInt(parts[0], 10)
  const centerCode = parseInt(parts[1], 10)
  const station = GU_TO_STATION[guCode]
  if (!station) return { station: '', center: '' }

  // 250 = index 0(현장대응단), 251 = index 1, 252 = index 2 ...
  const centerIdx = centerCode - 250
  const centers = fireStations[station] ?? []
  const center = centers[centerIdx] ?? `미확인(${centerCode})`
  return { station, center }
}

// 서울 중심 좌표 (서울시청 기준)
const SEOUL_CENTER_X = 126.978388
const SEOUL_CENTER_Y = 37.566610
// 서울 전체 커버 반경 50km
const SEOUL_RADIUS = 50000

// 개발: Vite 프록시 /api/seoulProxy → map.seoul.go.kr (Referer 자동 설정)
// 배포: Vercel 서버리스 함수 api/seoulProxy.js 가 처리
const themeApi = axios.create({
  baseURL: '/api/seoulProxy',
  timeout: 15000,
})

/**
 * 스마트서울맵 테마 콘텐츠 응답 → 앱 데이터 형식으로 변환
 */
/**
 * 주소 문자열에서 자치구 이름을 추출합니다.
 * 예: "서울특별시 마포구 상암동 ..." → "마포구"
 */
function extractGu(address) {
  if (!address) return ''
  const parts = address.split(' ')
  // 두 번째 토큰이 "XX구" 또는 "XX군" 형태인 경우
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

/**
 * 보이는소화기 목록을 스마트서울맵 테마 API로 가져옵니다.
 * - 서울 중심 50km 반경, 최대 1000개
 */
async function fetchPage(page_no) {
  const { data } = await themeApi.get('', {
    params: {
      apiPath: `openapi/v5/${THEME_KEY}/private/themes/contents/ko`,
      theme_id: THEME_ID,
      page_size: 1000,
      page_no,
      search_type: 0,
      coord_x: SEOUL_CENTER_X,
      coord_y: SEOUL_CENTER_Y,
      distance: SEOUL_RADIUS,
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

export async function fetchExtinguishers() {
  // 1페이지 먼저 가져오고 헤더에서 총 건수 추출
  const first = await fetchPage(1)
  console.log('[불끄미] API 헤더:', first.header)

  // 헤더 필드명이 API마다 다를 수 있어 여러 후보 탐색
  const headerObj = first.header ?? {}
  const totalCount = parseInt(
    headerObj.totalCount ?? headerObj.total_count ?? headerObj.TOTAL_COUNT ??
    headerObj.totalCnt ?? headerObj.total_cnt ?? headerObj.count ?? 0,
    10
  )
  const pageSize = 1000
  // totalCount 파싱 실패 시: 1000개 꽉 찼으면 다음 페이지 있다고 가정
  const firstBody = Array.isArray(first.body) ? first.body : []
  const totalPages = totalCount > 0
    ? Math.ceil(totalCount / pageSize)
    : (firstBody.length >= pageSize ? 999 : 1) // 안전하게 최대 999페이지까지

  const allItems = [...firstBody]

  // 2페이지부터 병렬 요청 (10페이지씩 묶어서)
  if (totalPages > 1) {
    const BATCH = 10
    for (let start = 2; start <= totalPages; start += BATCH) {
      const end = Math.min(start + BATCH - 1, totalPages)
      const batch = await Promise.all(
        Array.from({ length: end - start + 1 }, (_, i) => fetchPage(start + i))
      )
      let hasItems = false
      for (const d of batch) {
        const items = Array.isArray(d.body) ? d.body : []
        if (items.length > 0) hasItems = true
        allItems.push(...items)
        // 데이터가 page_size보다 적으면 마지막 페이지
        if (items.length < pageSize) { break }
      }
      if (!hasItems) break
    }
  }

  return allItems.map(mapThemeItem)
}

/**
 * 특정 소화기함 상세 정보를 가져옵니다.
 * (loadedItems에서 필터링 — 별도 API 호출 없음)
 */
export async function fetchExtinguisherDetail(id) {
  const all = await fetchExtinguishers()
  return all.find((item) => item.id === id) ?? null
}

/**
 * 소화기함 신고를 제출합니다.
 * @param {{ extinguisherId: string, type: string, memo: string }} payload
 */
export async function submitReport(payload) {
  // TODO: 실제 신고 API 연동 전까지 시뮬레이션
  console.warn('[불끄미] 신고 제출 시뮬레이션:', payload)
  return { ok: true, id: Date.now() }
}
