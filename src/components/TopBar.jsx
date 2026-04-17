import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

export default function TopBar() {
  const navigate = useNavigate()
  const { user, token, logout } = useAuthStore()

  const [showMenu, setShowMenu] = useState(false)
  const [showPwModal, setShowPwModal] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPwConfirm, setNewPwConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function openPwModal() {
    setShowMenu(false)
    setCurrentPw(''); setNewPw(''); setNewPwConfirm('')
    setPwError(null); setPwSuccess(false)
    setShowPwModal(true)
  }

  async function handleChangePw(e) {
    e.preventDefault()
    setPwError(null)
    if (newPw.length < 8) return setPwError('새 비밀번호는 8자 이상이어야 합니다.')
    if (newPw !== newPwConfirm) return setPwError('새 비밀번호가 일치하지 않습니다.')

    setPwLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) return setPwError(data.error)
      setPwSuccess(true)
      setTimeout(() => setShowPwModal(false), 1500)
    } catch {
      setPwError('서버 오류가 발생했습니다.')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <>
      {/* 상단 고정 바 */}
      <div className="fixed top-0 left-0 right-0 z-[9000] bg-red-600 text-white
        flex items-center justify-between px-4 py-2 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-base">🧯</span>
          <span className="font-bold text-sm hidden sm:block">불끄미</span>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold leading-tight">{user.name || user.email}</p>
              <p className="text-[10px] text-red-200 leading-tight hidden sm:block">{user.email}</p>
            </div>

            {/* 메뉴 버튼 */}
            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="w-8 h-8 rounded-full bg-red-700 hover:bg-red-800 flex items-center
                  justify-center text-white text-sm font-bold transition-colors"
              >
                {(user.name || user.email).charAt(0).toUpperCase()}
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-10 z-20 bg-white rounded-xl shadow-lg
                    border border-gray-100 w-44 py-1 text-gray-700">
                    <button
                      onClick={openPwModal}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                    >
                      🔑 비밀번호 변경
                    </button>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600
                        hover:bg-red-50 transition-colors"
                    >
                      로그아웃
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <Link
            to="/login"
            className="text-xs font-semibold bg-white text-red-600 px-3 py-1.5 rounded-lg
              hover:bg-red-50 transition-colors"
          >
            담당자 로그인
          </Link>
        )}
      </div>

      {/* 비밀번호 변경 모달 */}
      {showPwModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="font-bold text-base text-gray-800 mb-4">비밀번호 변경</h2>

            {pwSuccess ? (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm text-green-600 font-semibold">비밀번호가 변경되었습니다.</p>
              </div>
            ) : (
              <form onSubmit={handleChangePw} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">현재 비밀번호</label>
                  <input
                    type="password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    required
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                      focus:outline-none focus:border-red-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">새 비밀번호 (8자 이상)</label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    required
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                      focus:outline-none focus:border-red-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">새 비밀번호 확인</label>
                  <input
                    type="password"
                    value={newPwConfirm}
                    onChange={(e) => setNewPwConfirm(e.target.value)}
                    required
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                      focus:outline-none focus:border-red-400"
                  />
                </div>

                {pwError && <p className="text-xs text-red-500 text-center">{pwError}</p>}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPwModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="flex-1 py-2.5 rounded-xl text-sm bg-red-600 text-white
                      hover:bg-red-700 disabled:opacity-60 font-semibold"
                  >
                    {pwLoading ? '변경 중...' : '변경'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
