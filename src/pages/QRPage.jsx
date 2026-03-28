import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import useMapStore from '../store/useMapStore'
import { resolveStationCenter } from '../utils/stationUtils'

export default function QRPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { extinguishers } = useMapStore()

  const ext = extinguishers.find((e) => String(e.id) === String(id))
  const { station, center } = ext
    ? { station: ext.station, center: ext.center }
    : resolveStationCenter(id)

  const reportUrl = `${window.location.origin}/report/${id}`

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full">

        {/* 헤더 */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🧯</div>
          <h1 className="text-lg font-bold text-gray-800">보이는소화기 이상 신고</h1>
          <p className="text-xs text-gray-400 mt-1">QR코드를 스캔하면 신고 페이지로 이동합니다</p>
        </div>

        {/* QR코드 */}
        <div className="flex justify-center mb-6">
          <div className="p-4 border-2 border-gray-100 rounded-2xl">
            <QRCodeSVG
              value={reportUrl}
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>
        </div>

        {/* 소화기 정보 */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 mb-6 text-center">
          {ext ? (
            <>
              <p className="font-semibold text-sm text-gray-800">{ext.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{ext.address}</p>
              <p className="text-xs text-gray-300 mt-1">{station} · {center}</p>
            </>
          ) : (
            <p className="text-sm text-gray-500 font-mono">{id}</p>
          )}
          <p className="text-xs font-mono text-gray-300 mt-1 break-all">{id}</p>
        </div>

        {/* 인쇄 버튼 */}
        <button
          onClick={() => window.print()}
          className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors mb-3"
        >
          🖨️ 인쇄하기
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors"
        >
          돌아가기
        </button>

      </div>
    </div>
  )
}
