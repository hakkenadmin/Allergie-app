'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import UserProfile from '@/components/UserProfile'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { allergyService } from '@/lib/services/allergyService'
import { useAllergies } from '@/hooks/useAllergies'
import { COMMON_ALLERGIES } from '@/data/commonAllergies'
import { getAllStores } from '@/lib/services/menuService'
import type { Store } from '@/types/menu.types'

export default function SettingPage() {
  const { user, loading, isGuest, migrateGuestData } = useAuth()
  const { allergies, addAllergy, removeAllergy, syncing, loading: allergiesLoading } = useAllergies()
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [storesLoading, setStoresLoading] = useState(true)

  // Migrate guest data when user signs up
  useEffect(() => {
    if (user && !isGuest) {
      // User just signed up, migrate their guest data
      allergyService.migrateGuestData().catch(console.error)
    }
  }, [user, isGuest])

  // Load stores
  useEffect(() => {
    const loadStores = async () => {
      setStoresLoading(true)
      const data = await getAllStores()
      setStores(data)
      setStoresLoading(false)
    }
    loadStores()
  }, [])

  const toggleAllergy = async (id: number) => {
    const existing = allergies.find(a => a.allergyId === id)
    if (existing) {
      await removeAllergy(existing.id)
    } else {
      await addAllergy(id)
    }
  }

  const handleCheck = () => {
    if (allergies.length === 0) {
      alert('アレルギーを選択してください')
      return
    }
    if (!selectedStore) {
      alert('お店を選択してください')
      return
    }

    // Find store ID from selected store name
    const store = stores.find(s => s.store_name === selectedStore)
    if (store) {
      router.push(`/menu?storeid=${store.id}`)
    } else {
      router.push('/menu')
    }
  }

  // Get selected allergy IDs from localStorage/allergies
  const selectedAllergyIds = allergies.map(a => a.allergyId)

  if (loading) {
    return (
      <main className="flex-1 flex flex-col bg-gray-50">
        <Header />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-logo-orange mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">読み込み中...</p>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="flex-1 flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 flex flex-col">
        <div className="w-full max-w-5xl mx-auto px-6 sm:px-12 py-4 sm:py-8">
          {user && <UserProfile />}

          {/* アレルギー管理セクション（統合版） */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">
              アレルギー管理
            </h2>
            
            <div className="bg-gradient-to-br from-logo-green/5 to-logo-orange/5 rounded-xl p-6 sm:p-8 shadow-lg">
              {/* アレルギー選択 */}
              <div className="mb-8">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  🥜 あなたのアレルギーは？
                </h3>
                <p className="text-sm text-gray-600 mb-4">該当するものをすべて選択してください</p>
                {allergiesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-logo-orange mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">アレルギー情報を読み込み中...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      {COMMON_ALLERGIES.map((allergy) => {
                        const isSelected = selectedAllergyIds.includes(allergy.id)
                        return (
                          <button
                            key={allergy.id}
                            onClick={() => toggleAllergy(allergy.id)}
                            disabled={syncing}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              isSelected
                                ? 'bg-logo-orange text-white shadow-md'
                                : 'bg-white text-gray-700 border border-gray-200 hover:border-logo-orange hover:bg-orange-50'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {allergy.ja}
                          </button>
                        )
                      })}
                    </div>
                    {selectedAllergyIds.length > 0 && (
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-sm text-logo-green">
                          ✓ {selectedAllergyIds.length}件選択中
                        </p>
                        {syncing && (
                          <p className="text-sm text-logo-orange flex items-center">
                            <span className="animate-spin mr-2">⏳</span>
                            クラウドと同期中...
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
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
                              ? 'bg-logo-green text-white shadow-md'
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
                  disabled={selectedAllergyIds.length === 0 || !selectedStore}
                  className="px-8 py-4 bg-logo-orange text-white rounded-full font-semibold text-lg shadow-lg hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  メニューをチェック
                </button>
              </div>
            </div>
          </section>
        </div>
        <Footer />
      </div>
    </main>
  )
}

