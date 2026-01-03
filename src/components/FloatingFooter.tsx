'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function FloatingFooter() {
  const pathname = usePathname()
  const isSetting = pathname === '/setting'
  const isMenu = pathname.startsWith('/menu')
  const isIndexPage = pathname === '/'

  // Hide floating footer on index page
  if (isIndexPage) {
    return null
  }

  const baseBtn =
    'flex-1 text-center py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-colors rounded-md'

  const active = 'bg-logo-orange text-white shadow-md'
  const inactive = 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-200'

  return (
    <div className="fixed bottom-2 sm:bottom-4 left-0 right-0 z-30 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md px-3 sm:px-4">
        <div className="flex gap-2 sm:gap-3 bg-white/90 backdrop-blur border border-gray-200 shadow-lg rounded-xl p-1.5 sm:p-2">
          <Link
            href="/menu"
            className={`${baseBtn} ${isMenu ? active : inactive}`}
            aria-current={isMenu ? 'page' : undefined}
          >
            チェッカー
          </Link>
          <Link
            href="/setting"
            className={`${baseBtn} ${isSetting ? active : inactive}`}
            aria-current={isSetting ? 'page' : undefined}
          >
            設定
          </Link>
        </div>
      </div>
    </div>
  )
}



