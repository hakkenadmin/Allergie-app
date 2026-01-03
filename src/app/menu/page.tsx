'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MenuChecker from '@/components/MenuChecker'

function MenuPageContent() {
  const searchParams = useSearchParams()
  const storeIdParam = searchParams.get('storeid')
  const storeId = storeIdParam ? parseInt(storeIdParam, 10) : null

  return (
    <>
      <div className="mb-4 sm:mb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm sm:text-base">
          <span>←</span>
          <span>ホームに戻る</span>
        </Link>
      </div>
      <MenuChecker storeId={storeId} />
    </>
  )
}

export default function MenuPage() {
  return (
    <main className="flex-1 flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 flex flex-col">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
          <Suspense fallback={
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-logo-orange mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">読み込み中...</p>
            </div>
          }>
            <MenuPageContent />
          </Suspense>
        </div>
        <Footer />
      </div>
    </main>
  )
}



