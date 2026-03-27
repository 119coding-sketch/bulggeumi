import fireStations from '../data/fireStations'

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
 * COT_CONTS_ID로 소방서/센터명을 반환합니다.
 * 형식1: "83-251-2021-001234" → 구코드-센터코드-연도-번호
 * 형식2: "공용용-72" → 공용 소화기
 * 센터코드: 250=현장대응단(index 0), 251=index 1 ...
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
