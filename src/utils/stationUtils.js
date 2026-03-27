import fireStations from '../data/fireStations'

// 구코드 → 소방서명
export const GU_TO_STATION = {
  71: '종로소방서', 72: '중부소방서', 73: '광진소방서', 74: '용산소방서',
  75: '동대문소방서', 76: '영등포소방서', 77: '성북소방서', 78: '은평소방서',
  79: '강남소방서', 80: '서초소방서', 81: '강서소방서', 82: '강동소방서',
  83: '마포소방서', 84: '도봉소방서', 85: '구로소방서', 86: '노원소방서',
  87: '관악소방서', 88: '송파소방서', 89: '양천소방서', 90: '중랑소방서',
  91: '동작소방서', 92: '서대문소방서', 93: '강북소방서', 94: '성동소방서',
  95: '금천소방서',
}

// 소방서명 → 구코드 (역방향)
export const STATION_TO_GU = Object.fromEntries(
  Object.entries(GU_TO_STATION).map(([gu, st]) => [st, Number(gu)])
)

// 구코드 → 해당 자치구 검색 중심 좌표 + 반경
export const GU_SEARCH_PARAMS = {
  71: { lat: 37.5900, lng: 126.9815, radius: 3500 }, // 종로구
  72: { lat: 37.5638, lng: 126.9977, radius: 2500 }, // 중구
  73: { lat: 37.5388, lng: 127.0822, radius: 3500 }, // 광진구
  74: { lat: 37.5320, lng: 126.9905, radius: 3000 }, // 용산구
  75: { lat: 37.5744, lng: 127.0398, radius: 3500 }, // 동대문구
  76: { lat: 37.5264, lng: 126.8962, radius: 3500 }, // 영등포구
  77: { lat: 37.5894, lng: 127.0164, radius: 3500 }, // 성북구
  78: { lat: 37.6026, lng: 126.9292, radius: 4000 }, // 은평구
  79: { lat: 37.5172, lng: 127.0474, radius: 4000 }, // 강남구
  80: { lat: 37.4837, lng: 127.0325, radius: 4000 }, // 서초구
  81: { lat: 37.5509, lng: 126.8495, radius: 4500 }, // 강서구
  82: { lat: 37.5301, lng: 127.1238, radius: 4000 }, // 강동구
  83: { lat: 37.5636, lng: 126.9088, radius: 3500 }, // 마포구
  84: { lat: 37.6688, lng: 127.0471, radius: 3500 }, // 도봉구
  85: { lat: 37.4954, lng: 126.8875, radius: 3500 }, // 구로구
  86: { lat: 37.6542, lng: 127.0563, radius: 4500 }, // 노원구
  87: { lat: 37.4784, lng: 126.9516, radius: 3500 }, // 관악구
  88: { lat: 37.5145, lng: 127.1059, radius: 4500 }, // 송파구
  89: { lat: 37.5172, lng: 126.8665, radius: 3500 }, // 양천구
  90: { lat: 37.5960, lng: 127.0935, radius: 3500 }, // 중랑구
  91: { lat: 37.5124, lng: 126.9393, radius: 3000 }, // 동작구
  92: { lat: 37.5791, lng: 126.9368, radius: 3500 }, // 서대문구
  93: { lat: 37.6397, lng: 127.0125, radius: 3000 }, // 강북구
  94: { lat: 37.5633, lng: 127.0371, radius: 3000 }, // 성동구
  95: { lat: 37.4602, lng: 126.9001, radius: 2500 }, // 금천구
}

/**
 * COT_CONTS_ID로 소방서/센터명을 반환합니다.
 * 형식1: "83-251-2021-001234" → 구코드-센터코드-연도-번호
 * 형식2: "공용용-72" → 공용 소화기
 */
export function resolveStationCenter(contsId) {
  if (!contsId) return { station: '', center: '' }

  const parts = String(contsId).split('-')

  if (isNaN(parseInt(parts[0], 10))) {
    const guCode = parseInt(parts[1], 10)
    const station = GU_TO_STATION[guCode] ?? ''
    return { station, center: '공용' }
  }

  const guCode = parseInt(parts[0], 10)
  const centerCode = parseInt(parts[1], 10)
  const station = GU_TO_STATION[guCode]
  if (!station) return { station: '', center: '' }

  const centerIdx = centerCode - 250
  const centers = fireStations[station] ?? []
  const center = centers[centerIdx] ?? `미확인(${centerCode})`
  return { station, center }
}
