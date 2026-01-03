'use client'

import { useAllergies } from '@/hooks/useAllergies'
import { COMMON_ALLERGIES } from '@/data/commonAllergies'

export default function AllergySelector() {
  const { allergies, loading, syncing, addAllergy, removeAllergy } = useAllergies()

  const hasAllergy = (allergyId: number) =>
    allergies.some(a => a.allergyId === allergyId)

  const toggleCommon = (allergyId: number) => {
    const existing = allergies.find(a => a.allergyId === allergyId)
    if (existing) {
      removeAllergy(existing.id)
    } else {
      addAllergy(allergyId)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-logo-orange mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">アレルギー情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  const selectedCount = allergies.length

  return (
    <div className="w-full">
      {/* アレルギー選択 - ボタン形式のグリッドUI */}
      <div className="mb-8">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
          🥜 あなたのアレルギーは？
        </h3>
        <p className="text-sm text-gray-600 mb-4">該当するものをすべて選択してください</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {COMMON_ALLERGIES.map((allergy) => {
            const isSelected = hasAllergy(allergy.id)
            return (
              <button
                key={allergy.id}
                onClick={() => toggleCommon(allergy.id)}
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
        {selectedCount > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-logo-green">
              ✓ {selectedCount}件選択中
            </p>
            {syncing && (
              <p className="text-sm text-logo-orange flex items-center">
                <span className="animate-spin mr-2">⏳</span>
                クラウドと同期中...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}