import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  // step: 'form' | 'verify'
  const [step, setStep] = useState('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleRegister(e) {
    e.preventDefault()
    setError(null)

    if (!email.toLowerCase().endsWith('@seoul.go.kr')) {
      return setError('@seoul.go.kr 이메일만 가입 가능합니다.')
    }
    if (password.length < 8) {
      return setError('비밀번호는 8자 이상이어야 합니다.')
    }
    if (password !== passwordConfirm) {
      return setError('비밀번호가 일치하지 않습니다.')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error)
      setStep('verify')
    } catch {
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e) {
    e.preventDefault()
    setError(null)
    if (code.length !== 6) return setError('6자리 인증 코드를 입력해주세요.')

    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), code }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error)

      // 인증 완료 → 자동 로그인
      setAuth(data.token, data.email)
      navigate('/admin/dashboard', { replace: true })
    } catch {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">

        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🧯</div>
          <h1 className="text-xl font-bold text-gray-800">불끄미 회원가입</h1>
          <p className="text-sm text-gray-400 mt-1">서울시 담당자 전용</p>
        </div>

        {/* 진행 단계 표시 */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex-1 h-1.5 rounded-full ${step === 'form' ? 'bg-red-500' : 'bg-red-200'}`} />
          <div className={`flex-1 h-1.5 rounded-full ${step === 'verify' ? 'bg-red-500' : 'bg-gray-200'}`} />
        </div>

        {step === 'form' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                서울시 이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@seoul.go.kr"
                required
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                  focus:outline-none focus:border-red-400 text-gray-700 placeholder:text-gray-300"
              />
              <p className="text-xs text-gray-400 mt-1">@seoul.go.kr 이메일만 가입 가능합니다</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                비밀번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상"
                required
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                  focus:outline-none focus:border-red-400 text-gray-700 placeholder:text-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                비밀번호 확인 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호 재입력"
                required
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
              {loading ? '처리 중...' : '인증 코드 받기'}
            </button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 border border-blue-100">
              <strong>{email}</strong>로 인증 코드를 발송했습니다.<br />
              받은 메일함을 확인해주세요. (30분 이내 입력)
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                인증 코드 6자리 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                className="w-full text-center text-2xl font-bold tracking-widest border border-gray-200
                  rounded-xl px-3 py-3 focus:outline-none focus:border-red-400 text-gray-800
                  placeholder:text-gray-200 placeholder:text-lg"
              />
            </div>

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-red-600 text-white
                hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {loading ? '인증 중...' : '인증 완료'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('form'); setCode(''); setError(null) }}
              className="w-full py-2 rounded-xl text-sm text-gray-400 hover:text-gray-600"
            >
              이메일 다시 입력
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-5">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-red-600 font-semibold hover:underline">로그인</Link>
        </p>
      </div>
    </div>
  )
}
