'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function GuestIndicator() {
  const { isGuest } = useAuth()

  if (!isGuest) return null

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
      <p className="text-sm text-yellow-800">
        <span className="font-semibold">Guest Mode:</span> Your data is stored locally. 
        <span className="text-yellow-600"> Sign up to sync across devices and unlock premium features.</span>
      </p>
    </div>
  )
}


