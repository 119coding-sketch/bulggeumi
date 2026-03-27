// 더미 신고 데이터
const reports = [
  {
    id: 1,
    extinguisherId: 3,
    type: '소화기 없음',
    memo: '함 안에 소화기가 없습니다.',
    reportedAt: '2026-03-20T09:32:00',
    status: '출동중',
  },
  {
    id: 2,
    extinguisherId: 6,
    type: '함 파손',
    memo: '문짝 경첩이 부러져 있습니다.',
    reportedAt: '2026-03-21T14:15:00',
    status: '접수',
  },
  {
    id: 3,
    extinguisherId: 10,
    type: '소화기 부족',
    memo: '소화기가 반 정도 비어 있습니다.',
    reportedAt: '2026-03-21T16:40:00',
    status: '접수',
  },
  {
    id: 4,
    extinguisherId: 8,
    type: '기타',
    memo: '함 문이 잠겨서 열리지 않습니다.',
    reportedAt: '2026-03-22T08:20:00',
    status: '접수',
  },
  {
    id: 5,
    extinguisherId: 1,
    type: '함 파손',
    memo: '함 유리가 깨져 있었습니다.',
    reportedAt: '2026-03-19T11:00:00',
    status: '완료',
  },
]

export default reports
