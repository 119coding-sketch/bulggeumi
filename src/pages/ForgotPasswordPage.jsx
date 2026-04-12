import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  // step: 'email' | 'code'
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function handleSendCode(e) {
    e.preventDefault()
    setError(null)
    if (!email.toLowerCase().endsWith('@seoul.go.kr')) {
      return setError('@seoul.go.kr 이메일을 입력해주세요.')
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error)
      setStep('code')
    } catch {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setError(null)
    if (code.length !== 6) return setError('6자리 코드를 입력해주세요.')
    if (newPassword.length < 8) return setError('비밀번호는 8자 이상이어야 합니다.')
    if (newPassword !== newPasswordConfirm) return setError('비밀번호가 일치하지 않습니다.')

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), code, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error)
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">비밀번호가 변경되었습니다</h2>
          <p className="text-sm text-gray-500">잠시 후 로그인 페이지로 이동합니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">

        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔑</div>
          <h1 className="text-xl font-bold text-gray-800">비밀번호 찾기</h1>
          <p className="text-sm text-gray-400 mt-1">서울시 이메일로 재설정 코드를 받으세요</p>
        </div>

        {/* 단계 표시 */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex-1 h-1.5 rounded-full ${step === 'email' ? 'bg-red-500' : 'bg-red-200'}`} />
          <div className={`flex-1 h-1.5 rounded-full ${step === 'code' ? 'bg-red-500' : 'bg-gray-200'}`} />
        </div>

        {step === 'email' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">서울시 이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@seoul.go.kr"
                required
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                  focus:outline-none focus:border-red-400 text-gray-700 placeholder:text-gray-300"
              />
            </div>
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-red-600 text-white
                hover:bg-red-700 disabled:opacity-60 transition-colors">
              {loading ? '전송 중...' : '재설정 코드 받기'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 border border-blue-100">
              <strong>{email}</strong>로 재설정 코드를 발송했습니다. (30분 이내)
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">인증 코드 6자리</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center text-2xl font-bold tracking-widest border border-gray-200
                  rounded-xl px-3 py-3 focus:outline-none focus:border-red-400 text-gray-800 placeholder:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">새 비밀번호 (8자 이상)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                  focus:outline-none focus:border-red-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">새 비밀번호 확인</label>
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                  focus:outline-none focus:border-red-400"
              />
            </div>
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-red-600 text-white
                hover:bg-red-700 disabled:opacity-60 transition-colors">
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
            <button type="button" onClick={() => { setStep('email'); setCode(''); setError(null) }}
              className="w-full py-2 rounded-xl text-sm text-gray-400 hover:text-gray-600">
              이메일 다시 입력
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-5">
          <Link to="/login" className="text-red-600 font-semibold hover:underline">로그인으로 돌아가기</Link>
        </p>
      </div>
    </div>
  )
}
