import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import FloatingFooter from '@/components/FloatingFooter'

export const metadata: Metadata = {
  title: 'アレルギー管理アプリ',
  description: 'アレルギー情報と健康情報を管理',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="h-full">
      <body className="h-full bg-gray-50 pt-14 sm:pt-20 pb-18 sm:pb-24 flex flex-col overflow-x-hidden">
        <AuthProvider>
          <div className="flex-1 flex flex-col min-h-0">
            {children}
          </div>
          <FloatingFooter />
        </AuthProvider>
      </body>
    </html>
  )
}

