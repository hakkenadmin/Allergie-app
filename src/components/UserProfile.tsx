'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function UserProfile() {
  const { user, signOut } = useAuth()

  if (!user) return null

  const handleSignOut = async () => {
    if (confirm('ログアウトしてもよろしいですか？')) {
      await signOut()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">ログイン中:</p>
          <p className="font-semibold">{user.email}</p>
          <p className="text-xs text-green-600 mt-1">✓ プレミアム機能が有効です</p>
        </div>
        <button
          onClick={handleSignOut}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md text-sm transition-colors"
        >
          ログアウト
        </button>
      </div>
    </div>
  )
}


