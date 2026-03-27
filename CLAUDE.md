# 불끄미 (bulggeumi) 프로젝트 작업 지침

## 기본 원칙
- 작업 완료 후 브라우저 화면 기준으로 결과를 확인한다
- 화면이 의도대로 구현되지 않았으면 스스로 원인을 파악하고 수정한다
- 사용자에게 묻지 말고 스스로 판단해서 진행한다
- 단, 데이터 삭제·초기화 등 되돌릴 수 없는 작업은 먼저 알린다

## 프로젝트 개요
서울시 보이는소화기함에 QR코드/버튼을 부착해, 시민이 이상 상태를 신고하면
담당자가 근접 센터에서 출동해 확인·보충·결과보고를 하는 화재안전 현장관리 웹앱.

**사용자 역할 두 가지**
- 시민: QR 스캔 → 신고 유형 선택(소화기 없음/부족/함 파손/기타) → 제출
- 담당자: 신고 목록 확인 → 출동 → 현장 결과보고(사진 포함) → 완료 처리

## 배포
- **Vercel**: https://bulggeumi.vercel.app (자동 배포, GitHub main 브랜치 연동)
- **GitHub**: https://github.com/119coding-sketch/bulggeumi
- 로컬 개발: `npm run dev` → http://localhost:5173 (포트 충돌 시 5174)

## 기술 스택
- React + Vite
- react-leaflet + Leaflet (지도, CartoDB Light 타일)
- Zustand (상태관리, useContactStore는 localStorage persist)
- Axios (API 호출)
- Tailwind CSS

## 폴더 구조
```
src/
├── api/
│   └── seoulMap.js            # 스마트서울맵 API (fetchExtinguishers, resolveStationCenter)
├── components/
│   ├── Map.jsx                # 지도 컨테이너 (CartoDB Light 타일)
│   ├── Marker.jsx             # 지도 마커 + 팝업
│   └── Sidebar.jsx            # 소방서/센터 필터 + 목록/상세 패널
├── data/
│   ├── fireStations.js        # 서울시 25개 소방서 → 안전센터 계층 데이터
│   └── reports.js             # 더미 신고 데이터 5개
├── pages/
│   ├── MapPage.jsx            # 시민용 지도 화면 (/)
│   ├── ReportPage.jsx         # 시민 신고 폼 (/report/:id)
│   ├── AdminLoginPage.jsx     # 담당자 로그인 (/admin/login)
│   ├── AdminDashboardPage.jsx # 담당자 대시보드 (/admin/dashboard)
│   └── AdminContactsPage.jsx  # 연락처 관리 (/admin/contacts)
├── store/
│   ├── useMapStore.js         # 소화기함 목록 + 필터 (소방서/센터, 자치구 없음)
│   ├── useAuthStore.js        # 로그인 상태 (station, center)
│   ├── useReportStore.js      # 신고 목록 + 상태 업데이트
│   └── useContactStore.js     # 센터별 연락처 (localStorage persist)
├── App.jsx                    # React Router 라우팅
├── main.jsx
└── index.css

api/
└── seoulProxy.js              # Vercel 서버리스 프록시 (Referer 헤더 설정)
```

## 데이터 스펙 (소화기 오브젝트)
```js
{
  id: string,          // COT_CONTS_ID (예: "83-251-2021-001234")
  lat: number,
  lng: number,
  name: string,
  address: string,
  gu: string,          // 자치구명 (주소에서 추출)
  station: string,     // 소방서명 (COT_CONTS_ID 구코드로 매핑)
  center: string,      // 안전센터명 (COT_CONTS_ID 센터코드로 매핑)
  type: string,
  capacity: string,
  installedAt: string,
  status: string,      // '정상' | '점검필요'
}
```

## COT_CONTS_ID 파싱 규칙
형식: `구코드-센터코드-설치년도-번호` (예: `83-251-2021-001234`)

- **구코드 → 소방서**: 71=종로, 72=중부, 73=광진, 74=용산, 75=동대문, 76=영등포,
  77=성북, 78=은평, 79=강남, 80=서초, 81=강서, 82=강동, 83=마포, 84=도봉,
  85=구로, 86=노원, 87=관악, 88=송파, 89=양천, 90=중랑, 91=동작, 92=서대문,
  93=강북, 94=성동, 95=금천
- **센터코드 → 안전센터**: 250=현장대응단(index 0), 251=두번째센터(index 1), ... (구코드 무관)
  - `centerIdx = centerCode - 250` → fireStations[station][centerIdx]
- **공용 형식**: `공용용-72` 등 → center = '공용'

## API 연동
**스마트서울맵 테마 API** (보이는소화기 theme_id: 11103379)

- 개발: Vite 프록시 `/api/seoulProxy` → `https://map.seoul.go.kr`
- 배포: Vercel 서버리스 함수 `api/seoulProxy.js` (Referer 헤더 자동 설정)
- 환경변수 (Vercel + .env):
  - `VITE_THEME_API_KEY`: 스마트서울맵 테마 API 키
  - `VITE_MAP_API_KEY`: 지도 타일 API 키 (현재 CartoDB로 미사용)

**페이지네이션**: 1000개씩, totalCount 헤더 파싱 → 전체 페이지 자동 요청 (10페이지 배치)

## 연락처 관리
- `/admin/contacts` 페이지에서 소방서/센터별 연락처 등록·수정
- 저장: 현재 localStorage (추후 Vercel KV로 마이그레이션 예정)
- 필드: 소방차 번호, 본서 담당자 번호, 이메일
- 전화번호: 숫자 입력 시 자동으로 010-1234-5678 형식으로 변환

## 신고 흐름
1. 시민이 QR 스캔 → `/report/:extinguisherId`
2. 신고 유형 선택 + 메모 입력 → 제출
3. TODO: Vercel 서버리스 함수로 이메일(Resend) + SMS(알리고) 발송
4. 담당자가 대시보드에서 신고 확인 → 출동 처리 → 완료 처리

## 작업 순서
1. ✅ 더미 데이터로 지도 + 마커 + 사이드바 UI
2. ✅ API 연동 대비 구조 세팅
3. ✅ 소방서/안전센터 계층 데이터 + 담당자 로그인 + 대시보드
4. ✅ 신고 폼 UI (`/report/:id`) — 시민 QR 스캔 후 신고 제출
5. ⬜ QR코드 생성 기능
6. ⬜ 담당자 결과보고 (사진 첨부 포함)
7. ✅ 실제 API 연결 (스마트서울맵, Vercel 프록시)
8. ✅ Vercel 배포
9. ✅ 연락처 관리 페이지 (센터별 전화/이메일)
10. ⬜ 이메일 알림 (Resend 연동)
11. ⬜ SMS 알림 (알리고 연동)
12. ⬜ 연락처 클라우드 저장 (Vercel KV)

## 코딩 규칙
- 컴포넌트는 함수형으로 작성
- 변수명·함수명은 영어 camelCase
- 주석은 한국어로 작성
- .env 파일의 환경변수는 코드에 하드코딩 금지

---

## 수정로그
- [2026-03-22] markers.map is not a function → setMarkers에 Array.isArray 방어처리 추가
- [2026-03-22] 지도 타일 CartoDB Light → Stadia Alidade Smooth 교체
- [2026-03-22] 앱 이름 불거미 → 불끄미로 수정
- [2026-03-22] 더미 데이터 전국 → 상암동 일대 10개로 교체
- [2026-03-22] store 리팩토링: setMarkers/setLoading 분리 → fetchExtinguishers 액션 내장
- [2026-03-26] 스마트서울맵 실제 API 연동 (theme_id:11103379, Vite proxy)
- [2026-03-26] fireStations.js → 서울시 실제 25개 소방서 데이터로 교체
- [2026-03-26] AdminDashboardPage → 소방서·센터 2단 필터 추가
- [2026-03-27] Vercel 배포 완료 (GitHub Actions 자동 배포)
- [2026-03-27] 지도 타일 Stadia → CartoDB Light 교체 (API 키 불필요)
- [2026-03-27] COT_CONTS_ID 파싱으로 station/center 자동 매핑 (센터코드 250+index 규칙)
- [2026-03-27] 소방서 필터에서 전체·자치구 옵션 제거, 실제 데이터 기반 센터목록 동적 생성
- [2026-03-27] 페이지네이션 개선 (totalCount 다중 필드명 대응, 10페이지 배치 요청)
- [2026-03-27] 신고 폼 페이지 추가 (/report/:id)
- [2026-03-27] 연락처 관리 페이지 추가 (/admin/contacts), localStorage 저장
- [2026-03-27] 전화번호 자동 하이픈 포맷 (숫자 입력 → 010-xxxx-xxxx)
- [2026-03-27] Vercel 서버리스 프록시 api/seoulProxy.js 로 교체 (catch-all 파일명 문제 해결)
