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
        {/* ファーストビュー */}
        <section className="bg-gradient-to-br from-logo-green/50 via-white to-logo-orange/50 py-12 sm:py-16">
          <div className="max-w-5xl mx-auto px-6 sm:px-12">
              {/* メイン見出し - 中央揃え、大きく太字 */}
              <h1 className="text-4xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-8 leading-tight">
                アレルギー確認は、<br />
                これ一つで完結。
              </h1>
              {/* サブ見出し - 左揃え、小さめ */}
              <p className="text-sm sm:text-base md:text-lg text-gray-700 text-left max-w-2xl">
                複数チェーンのアレルギー情報を、<br className="sm:hidden" />
                探さず・迷わず確認できるアプリ
              </p>
            </div>
        </section>

        {/* 今すぐ試す（Start Now） */}
        <section id="start-now" className="py-12 sm:py-16 bg-white">
          <div className="max-w-5xl mx-auto px-6 sm:px-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
              今すぐ試す
            </h2>
            
            <div className="bg-gradient-to-br from-logo-green/5 to-logo-orange/5 rounded-xl p-6 sm:p-8 shadow-lg">
              {/* アレルギー選択 - AllergySelectorコンポーネントを使用 */}
              <div className="mb-8">
                <AllergySelector />
              </div>

              {/* お店選択 */}
              <div className="mb-8">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  🏪 知りたいお店は？
                </h3>
                {storesLoading ? (
                  <p className="text-gray-500">お店を読み込み中...</p>
                ) : stores.length === 0 ? (
                  <p className="text-gray-500">お店が登録されていません</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {stores.map((store) => {
                      const isSelected = selectedStore === store.store_name
                      return (
                        <button
                          key={store.id}
                          onClick={() => setSelectedStore(store.store_name)}
                          className={`px-4 py-3 rounded-lg text-left transition-all ${
                            isSelected
                              ? 'bg-logo-green text-white pushadow-md'
                              : 'bg-white text-gray-700 border border-gray-200 hover:border-logo-green hover:bg-green-50'
                          }`}
                        >
                          <span className="font-medium">{store.store_name}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* チェックボタン */}
              <div className="text-center">
                <button
                  onClick={handleCheck}
                  disabled={allergies.length === 0}
                  className="px-8 py-4 bg-logo-orange text-white rounded-full font-semibold text-lg shadow-lg hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  メニューをチェック
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 課題提起 */}
        <section className="py-12 sm:py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6 sm:px-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">
            読むのが難しい<br className="sm:hidden" />
              アレルギー表とはおさらば
            </h2>
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-3xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  見づらいシート
                </h3>
                <p className="text-gray-700 text-sm sm:text-base">
                  各チェーンの公式サイトに散らばっていて、スマホで探しにくい
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-3xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  毎回シートのデザインが違う
                </h3>
                <p className="text-gray-700 text-sm sm:text-base">
                  チェーンごとに書き方が違い、確認に時間がかかる
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-3xl mb-4">⏰</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  確認に数分もかかる!
                </h3>
                <p className="text-gray-700 text-sm sm:text-base">
                  外食前に何度もサイトを確認するのはストレスになる
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-3xl mb-4">😰</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  本当に確認できているか不安
                </h3>
                <p className="text-gray-700 text-sm sm:text-base">
                  食物アレルギーを持つ人やその家族に、常に不安がつきまとう
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* アレチェックとは */}
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-5xl mx-auto px-6 sm:px-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">
              アレチェックとは
            </h2>
            <div className="bg-gradient-to-br from-logo-green/5 to-logo-orange/5 rounded-lg shadow-lg p-6 sm:p-8 mb-8">
              <p className="text-lg sm:text-xl text-gray-800 mb-6 leading-relaxed">
                アレチェックは、複数のチェーン店のアレルギー情報を<br className="hidden sm:block" />
                一つのアプリで確認できるサービスです。
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-logo-green rounded-full flex items-center justify-center text-white font-bold">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">複数チェーンの情報を集約</h3>
                    <p className="text-gray-700 text-sm sm:text-base">
                      各チェーンのアレルギー情報を集めて、わかりやすく整理しています
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-logo-green rounded-full flex items-center justify-center text-white font-bold">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">すぐに確認できる</h3>
                    <p className="text-gray-700 text-sm sm:text-base">
                      スマホでサッと開いて、含まれる・含まれない食材をすぐに確認できます
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-logo-green rounded-full flex items-center justify-center text-white font-bold">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">迷わないデザイン</h3>
                    <p className="text-gray-700 text-sm sm:text-base">
                      統一された見やすい表示で、判断に迷いません
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 使われるシーン */}
        <section className="py-12 sm:py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6 sm:px-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">
              こんなときに使われています
            </h2>
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border-l-4 border-logo-orange shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  🍽️ 行くレストランで本当に食べれる？
                </h3>
                <p className="text-gray-700">
                  レストランに行く前に、メニューに含まれるアレルゲンを事前にチェック
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 border-l-4 border-logo-green shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  🏪 友人・同僚の店選びを後悔しない
                </h3>
                <p className="text-gray-700">
                  複数の候補店を比較して、安心して選べるお店を見つける
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 border-l-4 border-logo-blue shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  👥 幹事や店選び担当
                </h3>
                <p className="text-gray-700">
                  みんなで外食するとき、アレルギーのある人も安心して参加できるお店を選ぶ
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 border-l-4 border-logo-orange shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  👨‍👩‍👧‍👦 アレルギー持ちのお子さんも安心
                </h3>
                <p className="text-gray-700">
                  アレルギーを持つお子さんと一緒に、安心して外食を楽しむ
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 価値・メリット */}
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-5xl mx-auto px-6 sm:px-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 sm:mb-12 text-center">
              アレチェックの3つの価値
            </h2>
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
              <div className="bg-gradient-to-br from-logo-green/5 to-white rounded-lg shadow-md p-6 text-center">
                <div className="text-4xl mb-4">🔎</div>
                <h3 className="text-xl font-bold text-logo-green mb-3">
                  探さない
                </h3>
                <p className="text-gray-700 text-sm sm:text-base">
                  複数のサイトを行き来する必要がありません。一つのアプリですべて確認できます
                </p>
              </div>
              <div className="bg-gradient-to-br from-logo-orange/5 to-white rounded-lg shadow-md p-6 text-center">
                <div className="text-4xl mb-4">✨</div>
                <h3 className="text-xl font-bold text-logo-orange mb-3">
                  迷わない
                </h3>
                <p className="text-gray-700 text-sm sm:text-base">
                  統一された見やすい表示で、すぐに判断できます。迷う時間がなくなります
                </p>
              </div>
              <div className="bg-gradient-to-br from-logo-green/5 to-white rounded-lg shadow-md p-6 text-center">
                <div className="text-4xl mb-4">💚</div>
                <h3 className="text-xl font-bold text-logo-green mb-3">
                  安心して選べる
                </h3>
                <p className="text-gray-700 text-sm sm:text-base">
                  正確な情報をすぐに確認できるので、外食の不安を減らし、選択肢を広げられます
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* サインアップ特典セクション */}
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-5xl mx-auto px-6 sm:px-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">
              サインアップで<br className="sm:hidden" />
              さらに便利に
            </h2>
            <p className="text-lg sm:text-xl text-gray-700 mb-8 sm:mb-10 text-center max-w-2xl mx-auto">
              無料でアカウントを作成すると、以下の機能がアンロックされます
            </p>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8">
              <div className="bg-gradient-to-br from-logo-green/10 to-white rounded-lg p-6 border border-logo-green/20 shadow-sm">
                <div className="text-3xl mb-4">☁️</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  クラウド同期
                </h3>
                <p className="text-sm text-gray-700">
                  複数のデバイス間でアレルギー情報を自動同期。スマホ、タブレット、PCで同じデータにアクセスできます
                </p>
              </div>

              <div className="bg-gradient-to-br from-logo-orange/10 to-white rounded-lg p-6 border border-logo-orange/20 shadow-sm">
                <div className="text-3xl mb-4">📱</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  マルチデバイス対応
                </h3>
                <p className="text-sm text-gray-700">
                  どのデバイスからでも、保存したアレルギー情報とメニューチェック履歴にアクセスできます
                </p>
              </div>

              <div className="bg-gradient-to-br from-logo-blue/10 to-white rounded-lg p-6 border border-logo-blue/20 shadow-sm">
                <div className="text-3xl mb-4">💾</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  データバックアップ
                </h3>
                <p className="text-sm text-gray-700">
                  アレルギー情報がクラウドに安全に保存され、デバイスを紛失してもデータが失われません
                </p>
              </div>

              <div className="bg-gradient-to-br from-logo-green/10 to-white rounded-lg p-6 border border-logo-green/20 shadow-sm">
                <div className="text-3xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  詳細な分析
                </h3>
                <p className="text-sm text-gray-700">
                  チェックしたメニューの履歴を保存し、アレルギー傾向を分析できます
                </p>
              </div>

              <div className="bg-gradient-to-br from-logo-orange/10 to-white rounded-lg p-6 border border-logo-orange/20 shadow-sm">
                <div className="text-3xl mb-4">🔔</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  リマインダー機能
                </h3>
                <p className="text-sm text-gray-700">
                  定期的にアレルギー情報の確認をリマインダーでお知らせします
                </p>
              </div>

              <div className="bg-gradient-to-br from-logo-blue/10 to-white rounded-lg p-6 border border-logo-blue/20 shadow-sm">
                <div className="text-3xl mb-4">👨‍⚕️</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  医師との共有
                </h3>
                <p className="text-sm text-gray-700">
                  アレルギー情報を医師と共有して、より適切なアドバイスを受けられます
                </p>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/log-in"
                className="inline-flex items-center justify-center px-8 py-4 bg-logo-orange text-white rounded-full font-semibold text-lg shadow-lg hover:bg-orange-600 transition-colors"
              >
                今すぐサインアップ
              </Link>
            </div>
          </div>
        </section>

        {/* まとめ / CTA */}
        <section className="py-12 sm:py-16 bg-logo-green text-white">
          <div className="max-w-5xl mx-auto px-6 sm:px-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">
              外食の不安を減らし、<br className="sm:hidden" />
              選択肢を広げる
            </h2>
            <p className="text-lg sm:text-xl mb-8 sm:mb-10 text-green-50 max-w-2xl mx-auto">
              アレチェックは、食物アレルギーを持つ人やその家族が、<br className="hidden sm:block" />
              安心して外食を楽しめるようサポートするサービスです。
            </p>
            <p className="text-base sm:text-lg mb-8 text-green-100 max-w-xl mx-auto">
              複数のチェーン店のアレルギー情報を、<br className="sm:hidden" />
              探さず・迷わず確認できる。<br />
              それがアレチェックです。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="#start-now"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-logo-green rounded-full font-semibold text-lg shadow-lg hover:bg-gray-100 transition-colors"
              >
                今すぐ試す
              </Link>
              <Link
                href="/menu"
                className="inline-flex items-center justify-center px-8 py-4 bg-logo-orange text-white rounded-full font-semibold text-lg shadow-lg hover:bg-orange-600 transition-colors"
              >
                メニューをチェック
              </Link>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
