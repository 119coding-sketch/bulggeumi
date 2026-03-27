import { create } from 'zustand'
import dummyReports from '../data/reports'

const useReportStore = create((set, get) => ({
  reports: dummyReports,

  /** 신고 상태 업데이트: 접수 → 출동중 → 완료 */
  updateStatus: (reportId, status) =>
    set({
      reports: get().reports.map((r) =>
        r.id === reportId ? { ...r, status } : r
      ),
    }),

  /** 새 신고 추가 (시민 신고 제출 시) */
  addReport: (report) =>
    set({ reports: [report, ...get().reports] }),
}))

export default useReportStore
