'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getAllStores } from '@/lib/services/menuService'
import type { Store } from '@/types/menu.types'
import AllergySelector from '@/components/AllergySelector'
import { useAllergies } from '@/hooks/useAllergies'

export default function Home() {
  const { allergies } = useAllergies()
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [storesLoading, setStoresLoading] = useState(true)

  useEffect(() => {
    const loadStores = async () => {
      setStoresLoading(true)
      const data = await getAllStores()
      setStores(data)
      setStoresLoading(false)
    }
    loadStores()
  }, [])

  const handleCheck = () => {
    if (allergies.length === 0) {
      alert('アレルギーを選択してください')
      return
    }

    // Find store ID from selected store name
    if (selectedStore) {
      const store = stores.find(s => s.store_name === selectedStore)
      if (store) {
        router.push(`/menu?storeid=${store.id}`)
      } else {
        router.push('/menu')
      }
    } else {
      // No store selected - go to menu page showing all stores
      router.push('/menu')
    }
  }

  return (
    <main className="flex-1 flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-logo-green/50 via-white to-logo-orange/50 py-16 sm:py-20">
          <div className="max-w-2xl mx-auto px-6 text-center">
            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">
              アレルギー確認は、<br />
              これ一つで完結。
            </h1>
            
            {/* CTA Button */}
            <Link
              href="#start-now"
              className="inline-block px-8 py-4 bg-logo-green text-white rounded-full font-semibold text-lg shadow-lg hover:bg-green-600 transition-colors"
            >
              今すぐ試す
            </Link>
          </div>
        </section>

        {/* Quick Start CTA */}
        <section id="start-now" className="py-12 sm:py-16 bg-gray-50">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
              今すぐ試す
            </h2>
            
            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-lg">
              {/* Step 1: Allergy Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                  あなたのアレルギーを選択
                </h3>
                <AllergySelector />
              </div>

              {/* Step 2: Store Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                  お店を選ぶ
                </h3>
                {storesLoading ? (
                  <p className="text-gray-500 text-center">お店を読み込み中...</p>
                ) : stores.length === 0 ? (
                  <p className="text-gray-500 text-center">お店が登録されていません</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {stores.map((store) => {
                      const isSelected = selectedStore === store.store_name
                      return (
                        <button
                          key={store.id}
                          onClick={() => setSelectedStore(store.store_name)}
                          className={`px-4 py-3 rounded-lg text-center transition-all ${
                            isSelected
                              ? 'bg-logo-green text-white shadow-md'
                              : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-logo-green hover:bg-green-50'
                          }`}
                        >
                          <span className="font-medium">{store.store_name}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Check Button */}
              <div className="text-center">
                <button
                  onClick={handleCheck}
                  disabled={allergies.length === 0}
                  className="w-full sm:w-auto px-8 py-4 bg-logo-orange text-white rounded-full font-semibold text-lg shadow-lg hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  メニューをチェック
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Before/After Contrast */}
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
              こんな不安、ありませんか？
            </h2>
            
            <div className="grid sm:grid-cols-2 gap-6 mb-12">
              {/* Before */}
              <div className="bg-gray-100 rounded-lg p-6 sm:p-8">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">😰</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Before</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-gray-600">・</span>
                    <p className="text-gray-700">PDFを探すのに時間がかかる</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-600">・</span>
                    <p className="text-gray-700">表が読みにくい</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-600">・</span>
                    <p className="text-gray-700">本当に大丈夫か不安</p>
                  </div>
                </div>
              </div>
              
              {/* After */}
              <div className="bg-gradient-to-br from-logo-green/10 to-green-50 rounded-lg p-6 sm:p-8 border-2 border-logo-green/20">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">😊</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">After</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-logo-green font-bold">✓</span>
                    <p className="text-gray-700">3秒で確認完了</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-logo-green font-bold">✓</span>
                    <p className="text-gray-700">見やすい表示</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-logo-green font-bold">✓</span>
                    <p className="text-gray-700">安心して選べる</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Problem - Pain Points */}
        <section className="py-12 sm:py-16 bg-gray-50">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
              こんな不安、ありませんか？
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-4xl mb-4 text-center">😰</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
                  外食前の不安
                </h3>
                <p className="text-gray-700 text-center">
                  本当に大丈夫？
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-4xl mb-4 text-center">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
                  情報を探す時間
                </h3>
                <p className="text-gray-700 text-center">
                  何分もかかる...
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-4xl mb-4 text-center">📋</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
                  読みにくい表
                </h3>
                <p className="text-gray-700 text-center">
                  見づらくて困る
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Solution - How It Works */}
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
              アレチェックで解決
            </h2>
            
            <div className="space-y-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="text-4xl mb-4">1️⃣</div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    アレルギーを選択
                  </h3>
                  <p className="text-gray-700 text-sm">
                    あなたのアレルギーを選ぶだけ
                  </p>
                </div>
              </div>
              
              {/* Arrow */}
              <div className="text-center text-2xl text-gray-400">↓</div>
              
              {/* Step 2 */}
              <div className="text-center">
                <div className="text-4xl mb-4">2️⃣</div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    お店を選ぶ
                  </h3>
                  <p className="text-gray-700 text-sm">
                    知りたいお店を選択
                  </p>
                </div>
              </div>
              
              {/* Arrow */}
              <div className="text-center text-2xl text-gray-400">↓</div>
              
              {/* Step 3 */}
              <div className="text-center">
                <div className="text-4xl mb-4">✅</div>
                <div className="bg-gradient-to-br from-logo-green/10 to-green-50 rounded-lg p-6 border-2 border-logo-green/20">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    3秒で確認完了
                  </h3>
                  <p className="text-gray-700 text-sm">
                    すぐに結果がわかる
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
              こんな時に使えます
            </h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="text-4xl mb-3">🍽️</div>
                <h3 className="text-lg font-semibold text-gray-900">
                  レストランに行く前
                </h3>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="text-4xl mb-3">👥</div>
                <h3 className="text-lg font-semibold text-gray-900">
                  みんなで外食する時
                </h3>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
                <h3 className="text-lg font-semibold text-gray-900">
                  家族で外食する時
                </h3>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits - 3 Key Values */}
        <section className="py-12 sm:py-16 bg-gray-50">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
              3つの安心
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-logo-green mb-3">
                  探さない
                </h3>
                <p className="text-gray-700">
                  一つのアプリで完結
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                <div className="text-5xl mb-4">✨</div>
                <h3 className="text-xl font-bold text-logo-orange mb-3">
                  迷わない
                </h3>
                <p className="text-gray-700">
                  見やすい表示
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                <div className="text-5xl mb-4">💚</div>
                <h3 className="text-xl font-bold text-logo-green mb-3">
                  安心して選べる
                </h3>
                <p className="text-gray-700">
                  不安を減らせる
                </p>
              </div>
            </div>
          </div>
        </section>


        {/* Final CTA */}
        <section className="py-16 sm:py-20 bg-logo-green text-white">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              外食の不安を、<br />
              安心に変える
            </h2>
            
            <Link
              href="#start-now"
              className="inline-block mt-8 px-8 py-4 bg-white text-logo-green rounded-full font-semibold text-lg shadow-lg hover:bg-gray-100 transition-colors"
            >
              今すぐ無料で試す
            </Link>
            
            <p className="mt-4 text-green-100 text-sm">
              サインアップ不要
            </p>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
