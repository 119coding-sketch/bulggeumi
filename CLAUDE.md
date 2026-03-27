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

## 기술 스택
- React + Vite
- react-leaflet + Leaflet (지도)
- Zustand (상태관리)
- Axios (API 호출)
- Tailwind CSS

## 폴더 구조
```
src/
├── api/
│   └── seoulMap.js            # API 함수 모음 (fetchExtinguishers, submitReport 등)
├── components/
│   ├── Map.jsx                # 지도 컨테이너 (Stadia Alidade Smooth 타일)
│   ├── Marker.jsx             # 지도 마커 + 팝업
│   └── Sidebar.jsx            # 목록/상세/신고 패널 (담당자 링크 포함)
├── data/
│   ├── extinguishers.js       # 상암동 더미 데이터 10개 (station/center 필드 포함)
│   ├── fireStations.js        # 소방서 → 안전센터 계층 데이터
│   └── reports.js             # 더미 신고 데이터 5개
├── pages/
│   ├── MapPage.jsx            # 시민용 지도 화면 (/)
│   ├── AdminLoginPage.jsx     # 담당자 로그인 (/admin/login)
│   └── AdminDashboardPage.jsx # 담당자 대시보드 (/admin/dashboard)
├── store/
│   ├── useMapStore.js         # 소화기함 목록 + fetchExtinguishers 액션
│   ├── useAuthStore.js        # 로그인 상태 (station, center)
│   └── useReportStore.js      # 신고 목록 + 상태 업데이트
├── App.jsx                    # React Router 라우팅
├── main.jsx
└── index.css
```

## API 연동 방식
`.env` 파일에 `VITE_API_BASE_URL` 설정 여부로 자동 전환된다.
- 비어 있으면 → `src/data/extinguishers.js` 더미 데이터 반환
- URL 입력 시 → 실제 API 호출 (컴포넌트 코드 변경 없음)

```
# .env
VITE_API_BASE_URL=https://api.example.com   # 설정하면 즉시 API 연동
```

미리 준비된 API 함수 (`src/api/seoulMap.js`):
- `fetchExtinguishers()`        → GET  /api/extinguishers
- `fetchExtinguisherDetail(id)` → GET  /api/extinguishers/:id
- `submitReport(payload)`       → POST /api/reports

## 데이터 스펙 (소화기 오브젝트)
```js
{
  id: number,
  lat: number,
  lng: number,
  name: string,
  address: string,
  type: string,        // '분말 ABC형' | '이산화탄소형' | '포말형' | '할론형'
  capacity: string,    // '3.3kg' | '5.0kg' | '8.0L' 등
  installedAt: string, // 'YYYY-MM-DD'
  status: string,      // '정상' | '점검필요' | '교체필요'
}
```

## 작업 순서
1. ✅ 더미 데이터로 지도 + 마커 + 사이드바 UI
2. ✅ API 연동 대비 구조 세팅 (env 기반 fallback)
3. ✅ 소방서/안전센터 계층 데이터 + 담당자 로그인 + 대시보드 (신고 목록, 출동/완료 처리)
4. ⬜ 신고 폼 UI — 시민이 QR 스캔 후 신고 제출
5. ⬜ QR코드 생성 기능
6. ⬜ 담당자 결과보고 (사진 첨부 포함)
7. ✅ 실제 API 연결 (스마트서울맵 테마 API — 보이는소화기 theme_id: 11103379)
8. ⬜ Vercel 배포 (프록시 서버리스 함수 필요 — Referer 헤더 설정)

## 코딩 규칙
- 컴포넌트는 함수형으로 작성
- 변수명·함수명은 영어 camelCase
- 주석은 한국어로 작성
- .env 파일의 환경변수는 코드에 하드코딩 금지

## 스마트서울맵 API 상세

**실제 API 엔드포인트** (Vite 프록시 `/seoul-api` 경유):
```
GET /openapi/v5/{THEME_KEY}/private/themes/contents/ko
params: theme_id=11103379, search_type=0, coord_x, coord_y, distance, page_size, page_no
```

**응답 필드 매핑**:
| API 필드 | 앱 필드 |
|---|---|
| COT_COORD_X | lng |
| COT_COORD_Y | lat |
| COT_CONTS_NAME | name |
| COT_ADDR_FULL_NEW / COT_ADDR_FULL_OLD | address |
| COT_CONTS_ID | id |
| COT_REG_DATE | installedAt |
| COT_CONTS_STAT (1=정상) | status |

**인증 방식**: Referer 헤더 `https://map.seoul.go.kr/smgis2/openApi` 필수
→ Vite proxy에서 자동 설정 (개발 환경)
→ 배포 시 서버리스 함수(Vercel API Route 등)로 프록시 필요

---

## 수정로그
- [2026-03-22] markers.map is not a function → setMarkers에 Array.isArray 방어처리 추가
- [2026-03-22] 지도 타일 CartoDB Light → Stadia Alidade Smooth 교체
- [2026-03-22] 앱 이름 불거미 → 불끄미로 수정
- [2026-03-22] 더미 데이터 전국 → 상암동 일대 10개로 교체 (실제 데이터 아님)
- [2026-03-22] store 리팩토링: setMarkers/setLoading 분리 → fetchExtinguishers 액션 내장
- [2026-03-26] 스마트서울맵 실제 API 연동 (theme_id:11103379, Vite proxy /seoul-api)
- [2026-03-26] fireStations.js → 서울시 실제 27개 소방서 데이터로 교체
- [2026-03-26] AdminDashboardPage → 소방서·센터 2단 필터 추가 (각각 전체 포함)
- [2026-03-26] AdminLoginPage → 27개 소방서 스크롤 그리드로 리스트 개선
