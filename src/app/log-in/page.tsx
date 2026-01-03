'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { supabase } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resetMessages = () => {
    setMessage(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()

    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください。')
      return
    }
    if (mode === 'signup' && password !== confirm) {
      setError('パスワードが一致しません。')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setMessage('ログインに成功しました。')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('アカウントを作成しました。メールで確認（必要な場合）を行い、ログインしてください。')
      }
    } catch (err: any) {
      setError(err?.message || 'エラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-2xl font-bold mb-4">
                {mode === 'login' ? 'ログイン' : 'サインアップ'}
              </h1>
              <p className="text-sm text-gray-600 mb-4">
                {mode === 'login'
                  ? '保存されたアレルギー情報とメニューチェックにアクセスします。'
                  : 'アカウントを作成して、デバイス間でアレルギー情報とメニューチェックを同期します。'}
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">メールアドレス</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">パスワード</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">パスワード確認</label>
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}

                {error && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-logo-orange text-white py-2 rounded-md hover:bg-orange-600 disabled:bg-gray-400"
                >
                  {loading ? '処理中...' : mode === 'login' ? 'ログイン' : 'サインアップ'}
                </button>
              </form>

              <div className="mt-4 text-sm text-center text-gray-700">
                {mode === 'login' ? (
                  <>
                    アカウントをお持ちでない方は{' '}
                    <button
                      onClick={() => { setMode('signup'); resetMessages() }}
                      className="text-logo-blue hover:underline"
                    >
                      サインアップ
                    </button>
                  </>
                ) : (
                  <>
                    すでにアカウントをお持ちの方は{' '}
                    <button
                      onClick={() => { setMode('login'); resetMessages() }}
                      className="text-logo-blue hover:underline"
                    >
                      ログイン
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </main>
  )
}



