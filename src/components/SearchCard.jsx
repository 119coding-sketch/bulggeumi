import { useState, useRef, useEffect } from 'react'
import useMapStore from '../store/useMapStore'
import fireStations from '../data/fireStations'

const ALL_STATIONS = Object.keys(fireStations)

export default function SearchCard({ onOpenSidebar }) {
  const {
    filterStation, filterCenter,
    setFilterStation, setFilterCenter,
    getCenterList, getFiltered,
    flyTo,
    searchResults, setSearchResults, pinnedItems, pinItem, clearSearch,
    isLoading, loadedCount, totalCount,
  } = useMapStore()

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef(null)
  const cardRef = useRef(null)

  const centerList = getCenterList(filterStation)

  // 검색어 디바운스 (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // 검색 결과: 현재 필터 내에서 debouncedQuery로 매칭
  const results = debouncedQuery.trim().length > 0
    ? getFiltered()
        .filter((e) => {
          const q = debouncedQuery.trim().toLowerCase()
          return (
            String(e.id).toLowerCase().includes(q) ||
            e.name.toLowerCase().includes(q) ||
            e.address.toLowerCase().includes(q)
          )
        })
        .slice(0, 15)
    : []

  // 결과 목록이 바뀔 때마다 스토어에 저장
  useEffect(() => {
    if (results.length > 0) setSearchResults(results)
  }, [debouncedQuery, filterStation, filterCenter])

  // 카드 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClick(e) {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(item) {
    pinItem(item)   // 누적 추가 (이미 있으면 무시)
    flyTo(item)
    setQuery('')
    setOpen(false)
  }

  return (
    <div
      ref={cardRef}
      className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-auto md:w-72 z-[1000] bg-white rounded-xl shadow-lg border border-gray-100"
    >
      {/* 헤더 */}
      <div className="px-4 py-3 bg-red-600 rounded-t-xl flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-base tracking-tight">🧯 불끄미</h1>
          <p className="text-red-200 text-xs mt-0.5 hidden md:block">보이는소화기 관리 시스템</p>
        </div>
        {/* 모바일 전용 버튼 */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={onOpenSidebar}
            className="text-xs text-white/80 bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
          >
            목록 ☰
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-white/80 hover:text-white text-sm w-7 h-7 flex items-center justify-center"
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* 내용 — 모바일 collapsed 시 숨김 */}
      <div className={`px-3 py-3 space-y-2 ${expanded ? 'block' : 'hidden md:block'}`}>
        {/* 소방서 선택 */}
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1 block">소방서</label>
          <select
            value={filterStation}
            onChange={(e) => { setFilterStation(e.target.value); setQuery('') }}
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white
              focus:outline-none focus:border-red-400 text-gray-700"
          >
            {ALL_STATIONS.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* 센터 선택 */}
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1 block">안전센터</label>
          <select
            value={filterCenter}
            onChange={(e) => { setFilterCenter(e.target.value); setQuery('') }}
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white
              focus:outline-none focus:border-red-400 text-gray-700"
            disabled={isLoading && loadedCount === 0}
          >
            <option value="전체">전체 센터</option>
            {centerList.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* 코드 검색 */}
        <div className="relative">
          <label className="text-xs text-gray-400 font-medium mb-1 block">소화기 검색</label>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => query && setOpen(true)}
            placeholder="코드·명칭·주소 (예: 17_1)"
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white
              focus:outline-none focus:border-red-400 text-gray-700 placeholder:text-gray-300"
          />

          {/* 자동완성 드롭다운 */}
          {open && results.length > 0 && (
            <ul className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200
              rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {results.map((item) => {
                const pinned = pinnedItems.some((p) => p.id === item.id)
                return (
                  <li
                    key={item.id}
                    onMouseDown={() => handleSelect(item)}
                    className={`px-3 py-2 cursor-pointer border-b last:border-0 ${pinned ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-mono text-gray-500">{item.id}</p>
                      {pinned && <span className="text-xs text-red-400 shrink-0">선택됨</span>}
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 truncate">{item.address}</p>
                  </li>
                )
              })}
            </ul>
          )}

          {open && debouncedQuery.trim().length > 0 && results.length === 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200
              rounded-lg shadow-lg z-50 px-3 py-3 text-xs text-gray-400 text-center">
              검색 결과가 없습니다
            </div>
          )}
        </div>

        {/* 로딩 상태 / 개수 */}
        {isLoading ? (
          <div className="flex items-center gap-2 pt-1">
            <svg className="animate-spin h-3 w-3 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span className="text-xs text-gray-400">
              불러오는 중
              {totalCount > 0 && <span className="ml-1 font-medium text-gray-500">{loadedCount.toLocaleString()} / {totalCount.toLocaleString()}</span>}
            </span>
          </div>
        ) : (
          <p className="text-xs text-gray-400 pt-1">
            {getFiltered().length.toLocaleString()}개 표시
          </p>
        )}
      </div>
    </div>
  )
}
