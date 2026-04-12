# 불끄미 (bulggeumi) 프로젝트 작업 지침

## 기본 원칙
- 작업 완료 후 브라우저 화면 기준으로 결과를 확인한다
- 화면이 의도대로 구현되지 않았으면 스스로 원인을 파악하고 수정한다
- 사용자에게 묻지 말고 스스로 판단해서 진행한다
- 단, 데이터 삭제·초기화 등 되돌릴 수 없는 작업은 먼저 알린다
- 코드 수정 완료 후 항상 git commit + git push origin main 자동 실행
- CLAUDE.md 수정로그·작업순서도 함께 업데이트 후 커밋·푸시

## 프로젝트 개요
서울시 보이는소화기함에 QR코드/버튼을 부착해, 시민이 이상 상태를 신고하면
담당자가 근접 센터에서 출동해 확인·보충·결과보고를 하는 화재안전 현장관리 웹앱.

**사용자 역할 두 가지**
- 시민: QR 스캔 → 신고 유형 선택(소화기 없음/부족/함 파손/기타) → 제출
- 담당자: 신고 목록 확인 → 출동 → 현장 결과보고(사진 포함) → 완료 처리

## 배포
- **Vercel**: https://bulggeumi-pn1z.vercel.app (자동 배포, GitHub main 브랜치 연동)
- **GitHub**: https://github.com/119coding-sketch/bulggeumi
- 로컬 개발: `npm run dev` → http://localhost:5173 (포트 충돌 시 5174)

## 기술 스택
- React + Vite
- react-leaflet + Leaflet (지도, CartoDB Light 타일)
- Zustand (상태관리)
- nodemailer (Gmail SMTP 이메일 발송)
- Axios (API 호출)
- Tailwind CSS

## 폴더 구조
```
src/
├── api/
│   └── seoulMap.js            # 스마트서울맵 API (fetchExtinguishers, resolveStationCenter)
├── components/
│   ├── Map.jsx                # 지도 컨테이너 (CartoDB Light 타일) + FlyToController
│   ├── Marker.jsx             # 지도 마커 + 팝업
│   ├── SearchCard.jsx         # 지도 위 오버레이 카드 (소방서/센터 필터 + 소화기 검색 + 핀 기능)
│   └── Sidebar.jsx            # 목록/상세 패널 (검색 모드 시 핀 목록 표시)
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
│   ├── useMapStore.js         # 소화기함 목록 + 필터 + 검색/핀 + flyTo + 로딩 진행률
│   ├── useAuthStore.js        # 로그인 상태 (station, center)
│   ├── useReportStore.js      # 신고 목록 + 상태 업데이트
│   └── useContactStore.js     # 센터별 연락처 (localStorage persist)
├── App.jsx                    # React Router 라우팅
├── main.jsx
└── index.css

api/
├── seoulProxy.js              # Vercel 서버리스 프록시 (Referer 헤더 설정)
├── contacts.js                # 연락처 GET/POST/DELETE (Upstash Redis)
└── notify.js                  # 신고 접수 이메일 알림 (Gmail SMTP, nodemailer)
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
  - `UPSTASH_REDIS_REST_URL`: Upstash Redis URL (Vercel Integration 자동 주입)
  - `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis 토큰 (Vercel Integration 자동 주입)
  - `GMAIL_USER`: 이메일 발송용 Gmail 주소
  - `GMAIL_PASS`: Gmail 앱 비밀번호 (16자리)

**페이지네이션**: 1000개씩, totalCount 헤더 파싱 → 전체 페이지 자동 요청 (10페이지 배치)

## 연락처 관리
- `/admin/contacts` 페이지에서 소방서/센터별 연락처 등록·수정·삭제
- 저장: Upstash Redis (api/contacts.js GET/POST/DELETE)
- 필드: 이메일 (신고 알림 수신)
- Sidebar 헤더에서 연락처 관리 바로가기 버튼 제공

## 신고 흐름
1. 시민이 QR 스캔 또는 지도에서 소화기 선택 → `/report/:extinguisherId`
2. 신고 유형 선택 + 메모 입력 → 제출
3. api/notify.js → Gmail SMTP로 담당 센터 이메일 알림 발송
4. 담당자가 대시보드에서 신고 확인 → 출동 처리 → 완료 처리

## 작업 순서
1. ✅ 더미 데이터로 지도 + 마커 + 사이드바 UI
2. ✅ API 연동 대비 구조 세팅
3. ✅ 소방서/안전센터 계층 데이터 + 담당자 로그인 + 대시보드
4. ✅ 신고 폼 UI (`/report/:id`) — 시민 QR 스캔 후 신고 제출
5. ✅ QR코드 생성 기능 (/qr/:id, Sidebar에서 접근)
6. ✅ 담당자 결과보고 (사진 첨부 포함)
7. ✅ 실제 API 연결 (스마트서울맵, Vercel 프록시)
8. ✅ Vercel 배포
9. ✅ 연락처 관리 페이지 (센터별 전화/이메일)
10. ✅ SearchCard — 소방서/센터 필터 + 소화기 검색 + 핀(pin) 기능
11. ✅ 이메일 알림 (Gmail SMTP, nodemailer)
12. ⬜ SMS 알림 (알리고 연동)
13. ✅ 연락처 서버 저장 (Upstash Redis via Vercel Integration)
14. ✅ 연락처 삭제 기능
15. ✅ 지도 하단 신고하기 플로팅 버튼
16. ✅ 신고 시 마커 빨강, 조치완료 시 파랑 상태 시각화
17. ✅ 신고 데이터 Redis 저장 (다기기 공유)
18. ✅ 반응형 디자인 (모바일 최적화)
19. ✅ 담당자 로그인 제거 → 접수민원 버튼으로 대시보드 직접 접근

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
- [2026-03-28] SearchCard.jsx 신규 추가 — 지도 위 오버레이 카드 (소방서/센터 드롭다운 필터 + 코드·명칭·주소 텍스트 검색)
- [2026-03-28] 소화기 핀(pin) 기능 — 검색에서 선택한 항목을 지도에 누적 표시, 사이드바에서 X로 개별 제거, "검색 초기화"로 전체 해제
- [2026-03-28] flyTo 기능 — 소화기 선택 시 지도가 해당 위치로 부드럽게 이동 (FlyToController, zoom 17)
- [2026-03-28] 로딩 진행률 표시 — loadedCount/totalCount 실시간 업데이트 (SearchCard 하단 + Sidebar 스피너)
- [2026-03-28] Sidebar에서 소방서/센터 필터 UI 제거 → SearchCard로 이전, Sidebar는 목록/상세 전용으로 단순화
- [2026-03-28] 사이드바 목록에 소화기 코드(id) 폰트모노 표시 추가
- [2026-03-28] 연락처 저장소를 localStorage → Upstash Redis로 교체 (api/contacts.js GET/POST, @upstash/redis)
- [2026-03-28] AdminContactsPage: fetchContacts(mount 시 서버 조회) + saveContact(저장 버튼 클릭 시 서버 저장) 연결
- [2026-03-28] 환경변수 필요: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (Vercel Integration에서 자동 주입)
- [2026-03-28] 이메일 알림 Resend → Gmail SMTP 교체 (nodemailer, GMAIL_USER/GMAIL_PASS 환경변수)
- [2026-03-28] api/contacts.js DELETE 엔드포인트 추가, AdminContactsPage 삭제 버튼 추가
- [2026-03-28] MapPage 지도 하단 신고하기 플로팅 버튼 추가 (소화기 선택 시 활성화)
- [2026-03-28] Sidebar 헤더에 연락처 관리 바로가기 버튼 추가
- [2026-03-28] Map zoomControl 비활성화 (SearchCard와 겹침 해소)
- [2026-03-28] Vercel 배포 URL 확정: https://bulggeumi-pn1z.vercel.app
- [2026-03-28] 마커 색상: 정상=파랑, 이상=빨강 (divIcon), 신고 시 자동 빨강, 조치완료 버튼으로 파랑 복원
- [2026-03-28] Sidebar 상세 뷰: 이상 상태 시 조치완료 버튼 표시, 정상 시 이상 신고하기 버튼 표시
- [2026-03-28] 신고 데이터 Upstash Redis 저장 (api/reports.js) — 다기기 공유, 새로고침 후에도 유지
- [2026-03-28] useReportStore 전면 재작성: 더미 데이터 제거, Redis 기반 fetchReports/addReport/updateStatus
- [2026-03-28] Map.jsx: fetchExtinguishers 완료 후 fetchReports 순차 실행 (마커 색상 올바르게 반영)
- [2026-03-28] 반응형 디자인 적용 — SearchCard 모바일 접기/펼치기·목록 버튼, Sidebar 모바일 오버레이, AdminDashboardPage 카드뷰, AdminContactsPage 세로 배치
- [2026-03-28] 담당자 로그인 제거 — '접수민원' 버튼 클릭 시 대시보드 직접 접근, RequireAuth 가드 삭제
- [2026-03-28] QR코드 인쇄 기능 추가 — Sidebar 상세뷰에 'QR코드 인쇄' 버튼, /qr/:id 페이지 (qrcode.react)
- [2026-04-04] ReportPage: addReport try-catch 추가, 제출 실패 시 사용자에게 오류 표시
- [2026-04-04] ReportPage: 메모 200자 제한 + 글자수 카운터 표시
- [2026-04-04] AdminDashboardPage: 신고 목록 최신순 정렬, 조치완료 버튼 confirm 다이얼로그 추가
- [2026-04-04] Sidebar: STATUS_STYLE에 '이상' 케이스 추가 (빨강), 조치완료 confirm 다이얼로그 추가
- [2026-04-04] Sidebar: 모바일에서 목록 항목 클릭 시 사이드바 자동 닫힘 (onClose 호출)
- [2026-04-04] SearchCard: 검색 입력 디바운스 300ms 적용 (대용량 필터링 성능 개선)
- [2026-04-04] AdminContactsPage: 미저장 변경사항 '미저장' 뱃지 표시, 소방서 전환/탭 닫기 시 경고
- [2026-04-04] ReportPage: '이상없음' 신고 유형 추가 (초록 UI, 마커 색상 변경 안 함, 이메일 발송 생략)
- [2026-04-04] ReportPage: 사진 첨부 기능 추가 (Vercel Blob 저장, 10MB 제한, 미리보기)
- [2026-04-04] api/upload.js: 이미지 업로드 서버리스 함수 신규 추가 (@vercel/blob)
- [2026-04-04] useReportStore: 이상없음 타입은 마커 빨강 변경 제외
- [2026-04-04] AdminDashboardPage: 신고 사진 썸네일 표시 (모바일 카드 + 데스크톱 테이블)
- [2026-04-04] AdminDashboardPage: 엑셀 다운로드 버튼 추가 (xlsx, 신고일시/연도/월/일/소방서/센터/유형/사진URL)
- [2026-04-04] Map.jsx: 마커 key에 status 포함 — 모바일에서 이상 마커가 빨간색으로 안 뜨는 버그 수정
- [2026-04-04] Map.jsx: fetchReports await 추가 — 신고 데이터 로드 완료 후 마커 색상 보장
- [2026-04-04] api/upload.js: req 스트림 → Buffer 수집 방식으로 변경 (500 오류 수정)
- [2026-04-04] SearchCard: 모바일 상단 딱 붙임 (top-0 left-0 right-0, 라운드/테두리 제거)
- [2026-04-04] MapPage: h-screen → h-[100dvh] (모바일 브라우저 주소창 높이 보정)
- [2026-04-12] AdminActivitiesPage 신규 추가 (/admin/activities) — 관리자용 서포터즈 활동 현황 조회·엑셀 다운로드
- [2026-04-12] api/activities.js: dateFrom/dateTo/station/center 쿼리 필터 추가
- [2026-04-12] AdminDashboardPage 헤더에 '서포터즈 활동' 바로가기 버튼 추가
- [2026-04-12] 담당자 결과보고 기능 추가 — 대시보드에서 '결과보고' 버튼 클릭 시 모달(처리메모+사진첨부) → 완료 처리
- [2026-04-12] api/reports.js PATCH: result 필드(메모/사진URL/완료일시) 함께 저장
- [2026-04-12] useReportStore.updateStatus: result 파라미터 추가, 로컬·Redis 동시 반영
- [2026-04-12] 엑셀 다운로드: 사진URL 절대경로(window.location.origin) 변환 + 결과보고메모/사진/완료일시 컬럼 추가
- [2026-04-12] api/upload.js 삭제 (구버전 Vercel Blob, 미사용)
- [2026-04-12] 엑셀 사진URL 셀에 하이퍼링크 적용 (클릭 시 브라우저에서 이미지 열림)
