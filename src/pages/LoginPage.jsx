import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const { user, isLoading, setAuth } = useAuthStore()

  // 이미 로그인된 경우 홈으로 이동
  useEffect(() => {
    if (!isLoading && user) navigate('/', { replace: true })
  }, [user, isLoading, navigate])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error)

      setAuth(data.token, data.email)
      navigate('/admin/dashboard', { replace: true })
    } catch {
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">

        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🧯</div>
          <h1 className="text-xl font-bold text-gray-800">불끄미 로그인</h1>
          <p className="text-sm text-gray-400 mt-1">서울시 담당자 전용</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@seoul.go.kr"
              required
              autoComplete="email"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                focus:outline-none focus:border-red-400 text-gray-700 placeholder:text-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              required
              autoComplete="current-password"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                focus:outline-none focus:border-red-400 text-gray-700 placeholder:text-gray-300"
            />
          </div>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-red-600 text-white
              hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5">
          계정이 없으신가요?{' '}
          <Link to="/register" className="text-red-600 font-semibold hover:underline">회원가입</Link>
        </p>
        <p className="text-center text-xs text-gray-400 mt-2">
          <Link to="/forgot-password" className="text-gray-400 hover:text-red-600 hover:underline">비밀번호를 잊으셨나요?</Link>
        </p>
      </div>
    </div>
  )
}
