'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import Logo from './Logo'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function Header() {
  const { user, signOut } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const isIndexPage = pathname === '/'

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignOut = async () => {
    if (confirm('ログアウトしてもよろしいですか？')) {
      await signOut()
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
        <Logo size={40} />
        <div className="flex items-center gap-3">
          {isIndexPage ? null : user ? (
            <>
              <span className="text-sm text-gray-700">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                ログアウト
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-logo-orange text-white text-sm font-semibold shadow hover:bg-orange-600 transition-colors"
                aria-label="会員登録でもっと便利に"
              >
                <span>会員登録でもっと便利に</span>
              </button>
              {showModal && mounted && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                  <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-5">
                    <h3 className="text-lg font-semibold mb-2">会員登録でもっと便利に</h3>
                    <p className="text-sm text-gray-700 mb-3">
                      サインアップで有効化される機能：
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 mb-4 list-disc list-inside">
                      <li>デバイス間でのクラウド同期</li>
                      <li>アカウントに紐づくメニューアレルギーチェック</li>
                      <li>マルチデバイスアクセスとバックアップ</li>
                    </ul>
                    {!showSteps ? (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => {
                            setShowModal(false)
                            setShowSteps(false)
                            router.push('/log-in')
                          }}
                          className="text-sm px-3 py-2 rounded-md bg-logo-orange text-white hover:bg-orange-600 shadow"
                        >
                          サインアップ / ログイン手順
                        </button>
                        <button
                          onClick={() => { setShowModal(false); setShowSteps(false) }}
                          className="text-sm px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50"
                        >
                          閉じる
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-semibold">サインアップ手順</h4>
                          <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
                            <li>メニュー（チェッカー/設定）を開き、サインアップを選択します。</li>
                            <li>メールアドレスとパスワードを入力します。</li>
                            <li>メールで確認（必要な場合）を行います。</li>
                            <li>ログインしてクラウド同期とマルチデバイスアクセスを有効化します。</li>
                          </ol>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">ログイン手順</h4>
                          <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
                            <li>ログインフォームを開きます。</li>
                            <li>メールアドレスとパスワードを入力します。</li>
                            <li>保存されたアレルギー情報とメニューチェックにアクセスします。</li>
                          </ol>
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => { setShowModal(false); setShowSteps(false) }}
                            className="text-sm px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50"
                          >
                            閉じる
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}

