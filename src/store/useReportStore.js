import { create } from 'zustand'
import useMapStore from './useMapStore'

const useReportStore = create((set, get) => ({
  reports: [],
  isLoaded: false,

  /** 서버(Redis)에서 신고 목록 불러오기 + 마커 상태 적용 */
  fetchReports: async () => {
    if (get().isLoaded) return
    try {
      const res = await fetch('/api/reports')
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      const reports = Array.isArray(data) ? data : []
      set({ reports, isLoaded: true })

      // 활성 신고가 있는 소화기 마커를 이상(빨강)으로 표시
      const { updateExtinguisherStatus } = useMapStore.getState()
      reports.filter((r) => r.status !== '완료').forEach((r) => {
        updateExtinguisherStatus(String(r.extinguisherId), '이상')
      })
    } catch {
      set({ isLoaded: true })
    }
  },

  /** 신고 추가 (로컬 즉시 반영 + Redis 저장) */
  addReport: async (report) => {
    set((state) => ({ reports: [report, ...state.reports] }))
    useMapStore.getState().updateExtinguisherStatus(String(report.extinguisherId), '이상')
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })
    } catch (err) {
      console.error('[reports] 저장 오류:', err.message)
    }
  },

  /** 신고 상태 변경 (로컬 즉시 반영 + Redis 저장) */
  updateStatus: async (reportId, status) => {
    set((state) => ({
      reports: state.reports.map((r) => r.id === reportId ? { ...r, status } : r),
    }))

    // 조치완료 시 해당 소화기의 다른 활성 신고가 없으면 마커를 정상(파랑)으로
    if (status === '완료') {
      const reports = get().reports
      const target = reports.find((r) => r.id === reportId)
      if (target) {
        const hasOtherActive = reports.some(
          (r) => r.id !== reportId &&
                 String(r.extinguisherId) === String(target.extinguisherId) &&
                 r.status !== '완료'
        )
        if (!hasOtherActive) {
          useMapStore.getState().updateExtinguisherStatus(String(target.extinguisherId), '정상')
        }
      }
    }

    try {
      await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, status }),
      })
    } catch (err) {
      console.error('[reports] 상태 업데이트 오류:', err.message)
    }
  },
}))

export default useReportStore
