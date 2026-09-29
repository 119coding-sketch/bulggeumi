import { Link } from 'react-router-dom'

// 지도로 돌아가기 링크 — focusId 를 주면 지도에서 그 소화기함을 골라 그 자리로 이동한다
export default function BackToMap({ focusId, className = '' }) {
  const to = focusId ? `/?focus=${encodeURIComponent(focusId)}` : '/'
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors ${className}`}
    >
      ← 지도로 돌아가기
    </Link>
  )
}
