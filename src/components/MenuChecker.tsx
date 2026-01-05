'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAllergies } from '@/hooks/useAllergies'
import { getAllMenuItems, getAllStores, getStoreByName, getStoreById, matchMenuItems } from '@/lib/services/menuService'
import type { MenuItem, MenuItemMatch } from '@/types/menu.types'
import type { Store } from '@/types/menu.types'
import { COMMON_ALLERGIES } from '@/data/commonAllergies'

interface MenuCheckerProps {
  storeId?: number | null
}

export default function MenuChecker({ storeId }: MenuCheckerProps = {}) {
  const { allergies } = useAllergies()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStore, setSelectedStore] = useState<string>('all')
  const [selectedStoreInfo, setSelectedStoreInfo] = useState<Store | null>(null)
  const [matches, setMatches] = useState<MenuItemMatch[]>([])

  useEffect(() => {
    loadData()
  }, [])

  // Auto-select store if storeId is provided
  useEffect(() => {
    const autoSelectStore = async () => {
      if (storeId) {
        // First try to find in already loaded stores
        const store = stores.find(s => s.id === storeId)
        if (store) {
          setSelectedStore(store.store_name)
        } else {
          // If not found, fetch store by ID
          const fetchedStore = await getStoreById(storeId)
          if (fetchedStore) {
            setSelectedStore(fetchedStore.store_name)
          }
        }
      }
    }
    autoSelectStore()
  }, [storeId, stores])

  useEffect(() => {
    if (selectedStore !== 'all') loadStore(selectedStore)
    else setSelectedStoreInfo(null)
  }, [selectedStore])

  useEffect(() => {
    if (menuItems.length > 0) {
      const items = selectedStore === 'all' ? menuItems : menuItems.filter(m => m.store_name === selectedStore)
      setMatches(matchMenuItems(items, allergies))
    } else {
      setMatches([])
    }
  }, [menuItems, allergies, selectedStore])

  const loadData = async () => {
    setLoading(true)
    try {
      const [items, storeList] = await Promise.all([getAllMenuItems(), getAllStores()])
      setMenuItems(items)
      setStores(storeList)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadStore = async (name: string) => {
    const info = await getStoreByName(name)
    setSelectedStoreInfo(info)
  }

  const storeNames = ['all', ...new Set(menuItems.map(i => i.store_name))]

  // Helper to get allergy name from ID (Japanese first)
  const getAllergyName = (allergyId: number) => {
    const allergy = COMMON_ALLERGIES.find(a => a.id === allergyId)
    return allergy ? `${allergy.ja} (${allergy.name})` : `不明 (${allergyId})`
  }

  // Helper to get user allergy names for display (Japanese first)
  const getUserAllergyNames = () => {
    return allergies.map(a => {
      const allergy = COMMON_ALLERGIES.find(ca => ca.id === a.allergyId)
      return allergy ? `${allergy.ja} (${allergy.name})` : `不明 (${a.allergyId})`
    })
  }

  if (loading) {
    return <div className="bg-white rounded-none sm:rounded-lg shadow-md p-6">メニュー項目を読み込み中...</div>
  }

  const filtered = selectedStore === 'all' ? menuItems : menuItems.filter(i => i.store_name === selectedStore)
  const matchedIds = new Set(matches.map(m => m.menuItem.id))
  
  // Calculate matching percentage
  const totalItems = filtered.length
  const matchedItems = matches.length
  const usableItems = totalItems - matchedItems
  const matchingPercentage = totalItems > 0 ? Math.round((usableItems / totalItems) * 100) : 0
  
  const sorted = [...filtered].sort((a, b) => {
    const aMatch = matchedIds.has(a.id) ? 0 : 1
    const bMatch = matchedIds.has(b.id) ? 0 : 1
    if (aMatch !== bMatch) return aMatch - bMatch
    const storeCompare = (a.store_name || '').localeCompare(b.store_name || '')
    if (storeCompare !== 0) return storeCompare
    return (a.menu_name || '').localeCompare(b.menu_name || '')
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded shadow-md p-4 sm:p-6 mb-8 sm:mb-15p">
        <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">メニューアレルギーチェッカー</h3>
        <div className="mb-3 sm:mb-4">
          <label className="block text-sm font-medium mb-2">店舗でフィルター:</label>
          <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)} className="w-full p-2 border border-gray-300 rounded-none sm:rounded-md">
            {storeNames.map(s => <option key={s} value={s}>{s === 'all' ? 'すべての店舗' : s}</option>)}
          </select>
        </div>

        {selectedStoreInfo && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-none sm:rounded mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">{selectedStoreInfo.store_name}</h4>
              {selectedStoreInfo.verified === 'y' && (
                <span className="px-2 py-1 text-xs font-semibold bg-logo-green text-white rounded">
                  認証済み
                </span>
              )}
            </div>
            {selectedStoreInfo.description && <p className="text-sm text-gray-700">{selectedStoreInfo.description}</p>}
            {selectedStoreInfo.managing_company && <p className="text-sm text-gray-600">運営会社: {selectedStoreInfo.managing_company}</p>}
            {selectedStoreInfo.website && <a className="text-sm text-logo-blue" href={selectedStoreInfo.website} target="_blank" rel="noreferrer">ウェブサイトを訪問</a>}
          </div>
        )}

        {/* Matching Percentage Display */}
        {selectedStore !== 'all' && totalItems > 0 && allergies.length > 0 && (
          <div className="mb-4 p-4 mb:p-0 bg-gradient-to-r from-logo-green/10 to-logo-orange/10 border border-logo-green/20 rounded">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">利用可能なメニュー</h4>
                <p className="text-xs text-gray-600">
                  {usableItems} / {totalItems} メニュー項目
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl sm:text-4xl font-bold text-logo-green">
                  {matchingPercentage}%
                </div>
                <p className="text-xs text-gray-600">利用可能</p>
              </div>
            </div>
          </div>
        )}

        {allergies.length === 0 && <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-none sm:rounded">まずアレルギーを追加してください。</div>}
        
        {/* Display user allergies */}
        {allergies.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">あなたのアレルギー:</h4>
              <Link href="/setting" className="text-sm text-logo-orange underline hover:text-orange-600">
                編集
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {getUserAllergyNames().map((name, idx) => (
                <span key={idx} className="text-xs px-2 py-1 rounded bg-logo-green/20 text-logo-green">{name}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded shadow-md p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">メニュー項目 ({filtered.length})</h3>
        {filtered.length === 0 ? <p className="text-gray-500">メニュー項目が見つかりませんでした。</p> : (
          <div className="space-y-4">
            {sorted.map(item => {
              const match = matches.find(m => m.menuItem.id === item.id)
              const has = !!match
              const hasContains = match?.matchedContainsIds.length > 0
              const hasOnlyShare = match && match.matchedContainsIds.length === 0 && match.matchedShareIds.length > 0
              return (
                <div key={item.id} className={`border-2 rounded-none sm:rounded-lg p-4 ${
                  hasContains 
                    ? 'border-red-200 bg-red-50/30' 
                    : hasOnlyShare 
                      ? 'border-green-200 bg-green-50/30' 
                      : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                    {/* Left side: Menu name, description, and match info */}
                    <div className="flex-1 w-full">
                      <h4 className="font-bold text-lg text-gray-900 mb-1">{item.menu_name}</h4>
                      {item.description && <p className="text-sm text-gray-700 mb-2">{item.description}</p>}
                      {has && match && (
                        <div className="mt-2 space-y-2">
                          {/* Contains allergies - Red */}
                          {match.matchedContainsIds.length > 0 && (
                            <div className="px-3 py-1 bg-red-50 rounded-none sm:rounded-md inline-block">
                              <p className="text-sm font-medium text-red-600">
                                含有一致: {match.matchedContainsIds.map(id => {
                                  const allergy = COMMON_ALLERGIES.find(a => a.id === id)
                                  return allergy ? `${allergy.ja} (${allergy.name})` : `不明 (${id})`
                                }).join(', ')}
                              </p>
                            </div>
                          )}
                          {/* Share allergies - Green */}
                          {match.matchedShareIds.length > 0 && (
                            <div className="px-3 py-1 bg-green-50 rounded-none sm:rounded-md inline-block">
                              <p className="text-sm font-medium text-green-600">
                                共有一致: {match.matchedShareIds.map(id => {
                                  const allergy = COMMON_ALLERGIES.find(a => a.id === id)
                                  return allergy ? `${allergy.ja} (${allergy.name})` : `不明 (${id})`
                                }).join(', ')}
                              </p>
                            </div>
                          )}
                          {/* Allergy icons below match field on mobile */}
                          <div className="flex gap-2 mt-2 sm:hidden">
                            {(item.allergies_contains?.length > 0 || item.allergies_share?.length > 0) ? (
                              <>
                                {/* Contains allergies */}
                                {item.allergies_contains?.map((allergyId, idx) => {
                                  const allergy = COMMON_ALLERGIES.find(a => a.id === allergyId)
                                  const isMatched = match?.matchedContainsIds.includes(allergyId) || false
                                  return (
                                    <div
                                      key={`contains-${idx}`}
                                      className={`w-10 h-10 rounded-none flex items-center justify-center relative ${
                                        isMatched ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-100 border border-gray-300'
                                      }`}
                                      title={allergy ? `${allergy.ja} (含有)` : ''}
                                    >
                                      {allergy?.image ? (
                                        <>
                                          <img
                                            src={allergy.image}
                                            alt={allergy.ja}
                                            className="w-full h-full object-contain rounded-none opacity-75"
                                          />
                                          <span className="absolute bottom-0 right-0 text-[8px] font-bold">●</span>
                                        </>
                                      ) : (
                                        <span className="text-xs text-gray-500 opacity-75">●</span>
                                      )}
                                    </div>
                                  )
                                })}
                                {/* Share allergies */}
                                {item.allergies_share?.map((allergyId, idx) => {
                                  const allergy = COMMON_ALLERGIES.find(a => a.id === allergyId)
                                  const isMatched = match?.matchedShareIds.includes(allergyId) || false
                                  return (
                                    <div
                                      key={`share-${idx}`}
                                      className={`w-10 h-10 rounded-none flex items-center justify-center relative ${
                                        isMatched ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-100 border border-gray-300'
                                      }`}
                                      title={allergy ? `${allergy.ja} (共有設備)` : ''}
                                    >
                                      {allergy?.image ? (
                                        <>
                                          <img
                                            src={allergy.image}
                                            alt={allergy.ja}
                                            className="w-full h-full object-contain rounded-none opacity-75"
                                          />
                                          <span className="absolute bottom-0 right-0 text-[8px] font-bold">△</span>
                                        </>
                                      ) : (
                                        <span className="text-xs text-gray-500 opacity-75">△</span>
                                      )}
                                    </div>
                                  )
                                })}
                              </>
                            ) : (
                              <div className="w-10 h-10 rounded-none bg-green-100 border border-green-300 flex items-center justify-center">
                                <span className="text-xs text-green-600">✓</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Show allergy icons even when no match on mobile */}
                      {!has && (item.allergies_contains?.length > 0 || item.allergies_share?.length > 0) && (
                        <div className="flex gap-2 mt-2 sm:hidden">
                          {/* Contains allergies */}
                          {item.allergies_contains?.map((allergyId, idx) => {
                            const allergy = COMMON_ALLERGIES.find(a => a.id === allergyId)
                            return (
                              <div
                                key={`contains-${idx}`}
                                className="w-10 h-10 rounded-none bg-gray-100 border border-gray-300 flex items-center justify-center relative"
                                title={allergy ? `${allergy.ja} (含有)` : ''}
                              >
                                {allergy?.image ? (
                                  <>
                                    <img
                                      src={allergy.image}
                                      alt={allergy.ja}
                                      className="w-full h-full object-contain rounded-none opacity-75"
                                    />
                                    <span className="absolute bottom-0 right-0 text-[8px] font-bold">●</span>
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-500 opacity-75">●</span>
                                )}
                              </div>
                            )
                          })}
                          {/* Share allergies */}
                          {item.allergies_share?.map((allergyId, idx) => {
                            const allergy = COMMON_ALLERGIES.find(a => a.id === allergyId)
                            return (
                              <div
                                key={`share-${idx}`}
                                className="w-10 h-10 rounded-none bg-gray-100 border border-gray-300 flex items-center justify-center relative"
                                title={allergy ? `${allergy.ja} (共有設備)` : ''}
                              >
                                {allergy?.image ? (
                                  <>
                                    <img
                                      src={allergy.image}
                                      alt={allergy.ja}
                                      className="w-full h-full object-contain rounded-none opacity-75"
                                    />
                                    <span className="absolute bottom-0 right-0 text-[8px] font-bold">△</span>
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-500 opacity-75">△</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {!has && (!item.allergies_contains || item.allergies_contains.length === 0) && (!item.allergies_share || item.allergies_share.length === 0) && (
                        <div className="w-10 h-10 rounded-none bg-green-100 border border-green-300 flex items-center justify-center mt-2 sm:hidden">
                          <span className="text-xs text-green-600">✓</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Right side: Allergy items - Hidden on mobile */}
                    <div className="hidden sm:flex sm:flex-col sm:items-start sm:ml-4">
                      <div>
                        <div className="flex gap-2">
                          {(item.allergies_contains?.length > 0 || item.allergies_share?.length > 0) ? (
                            <>
                              {/* Contains allergies */}
                              {item.allergies_contains?.map((allergyId, idx) => {
                                const allergy = COMMON_ALLERGIES.find(a => a.id === allergyId)
                                const isMatched = match?.matchedContainsIds.includes(allergyId) || false
                                return (
                                  <div
                                    key={`contains-${idx}`}
                                    className={`w-10 h-10 rounded-md flex items-center justify-center relative ${
                                      isMatched ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-100 border border-gray-300'
                                    }`}
                                    title={allergy ? `${allergy.ja} (含有)` : ''}
                                  >
                                    {allergy?.image ? (
                                      <>
                                        <img
                                          src={allergy.image}
                                          alt={allergy.ja}
                                          className="w-full h-full object-contain rounded-md opacity-75"
                                        />
                                        <span className="absolute bottom-0 right-0 text-[8px] font-bold">●</span>
                                      </>
                                    ) : (
                                      <span className="text-xs text-gray-500 opacity-75">●</span>
                                    )}
                                  </div>
                                )
                              })}
                              {/* Share allergies */}
                              {item.allergies_share?.map((allergyId, idx) => {
                                const allergy = COMMON_ALLERGIES.find(a => a.id === allergyId)
                                const isMatched = match?.matchedShareIds.includes(allergyId) || false
                                return (
                                  <div
                                    key={`share-${idx}`}
                                    className={`w-10 h-10 rounded-md flex items-center justify-center relative ${
                                      isMatched ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-100 border border-gray-300'
                                    }`}
                                    title={allergy ? `${allergy.ja} (共有設備)` : ''}
                                  >
                                    {allergy?.image ? (
                                      <>
                                        <img
                                          src={allergy.image}
                                          alt={allergy.ja}
                                          className="w-full h-full object-contain rounded-md opacity-75"
                                        />
                                        <span className="absolute bottom-0 right-0 text-[8px] font-bold">△</span>
                                      </>
                                    ) : (
                                      <span className="text-xs text-gray-500 opacity-75">△</span>
                                    )}
                                  </div>
                                )
                              })}
                            </>
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-green-100 border border-green-300 flex items-center justify-center">
                              <span className="text-xs text-green-600">✓</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


