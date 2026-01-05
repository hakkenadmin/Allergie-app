'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AllergySelector from '@/components/AllergySelector'
import UserProfile from '@/components/UserProfile'

function SettingPageContent() {
  return (
    <>
      <div className="mb-4 sm:mb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm sm:text-base">
          <span>←</span>
          <span>ホームに戻る</span>
        </Link>
      </div>
      
      <div className="bg-white rounded-none sm:rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">設定</h1>
        <p className="text-sm text-gray-600 mb-6">アレルギー情報を管理します</p>
        
        <UserProfile />
        
        <div className="mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">アレルギー設定</h2>
          <AllergySelector />
        </div>
      </div>
    </>
  )
}

export default function SettingPage() {
  return (
    <main className="flex-1 flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 w-full sm:max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
          <Suspense fallback={<div className="text-center py-8">読み込み中...</div>}>
            <SettingPageContent />
          </Suspense>
        </div>
      </div>
      <Footer />
    </main>
  )
}


