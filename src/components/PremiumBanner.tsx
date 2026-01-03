'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import AuthForm from './AuthForm'

export default function PremiumBanner() {
  const { isGuest } = useAuth()
  const [showSignUp, setShowSignUp] = useState(false)

  if (!isGuest) return null

  if (showSignUp) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <button
          onClick={() => setShowSignUp(false)}
          className="text-gray-500 hover:text-gray-700 mb-4 flex items-center"
        >
          <span className="mr-2">←</span> Back
        </button>
        <AuthForm />
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2">Unlock Premium Features!</h3>
          <p className="text-blue-100 mb-4">
            Sign up for free to sync your data across devices, get reminders, and more.
          </p>
          <ul className="text-sm space-y-1 text-blue-100">
            <li>✓ Cloud sync across all your devices</li>
            <li>✓ Data backup and recovery</li>
            <li>✓ Allergy reminders and notifications</li>
            <li>✓ Export your data</li>
            <li>✓ Share with your doctor</li>
          </ul>
        </div>
        <button
          onClick={() => setShowSignUp(true)}
          className="bg-white text-blue-600 font-semibold py-2 px-6 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
        >
          Sign Up Free
        </button>
      </div>
    </div>
  )
}


