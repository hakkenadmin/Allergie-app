'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getMenuItemsByStore } from '@/lib/services/menuService'
import type { Store, MenuItem } from '@/types/menu.types'
import { COMMON_ALLERGIES, type CommonAllergy } from '@/data/commonAllergies'

interface MenuTableProps {
  store: Store
  onClose: () => void
  refreshKey?: number
  onCsvUpload?: () => void
  onPdfUpload?: () => void
}

export default function MenuTable({ store, onClose, refreshKey, onCsvUpload, onPdfUpload }: MenuTableProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [editingMenuField, setEditingMenuField] = useState<{ itemId: number; field: string } | null>(null)
  const [editMenuValue, setEditMenuValue] = useState<string>('')
  const [editingAllergies, setEditingAllergies] = useState<number | null>(null)
  const [tempAllergiesContains, setTempAllergiesContains] = useState<number[]>([])
  const [tempAllergiesShare, setTempAllergiesShare] = useState<number[]>([])
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    menu_name: '',
    description: '',
    price: undefined,
    category: '',
    allergies_contains: [],
    allergies_share: [],
    is_published: true,
    note: '',
  })

  // Load menu items when component mounts or store changes or refreshKey changes
  useEffect(() => {
    loadMenuItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.store_name, refreshKey])

  const loadMenuItems = async () => {
    setMenuLoading(true)
    try {
      const items = await getMenuItemsByStore(store.store_name)
      setMenuItems(items)
    } catch (err) {
      console.error('Error loading menu items:', err)
    } finally {
      setMenuLoading(false)
    }
  }

  const handleEditMenuField = (item: MenuItem, field: string) => {
    let value = ''
    if (field === 'menu_name') value = item.menu_name
    else if (field === 'description') value = item.description || ''
    else if (field === 'price') value = item.price?.toString() || ''
    else if (field === 'category') value = item.category || ''
    else if (field === 'note') value = item.note || ''

    setEditingMenuField({ itemId: item.id, field })
    setEditMenuValue(value)
  }

  const handleCreateNew = () => {
    setIsCreatingNew(true)
    setNewItem({
      menu_name: '',
      description: '',
      price: undefined,
      category: '',
      allergies_contains: [],
      allergies_share: [],
      is_published: true,
      note: '',
    })
  }

  const handleCancelCreate = () => {
    setIsCreatingNew(false)
    setNewItem({
      menu_name: '',
      description: '',
      price: undefined,
      category: '',
      allergies_contains: [],
      allergies_share: [],
      is_published: true,
      note: '',
    })
  }

  const handleSaveNew = async () => {
    if (!newItem.menu_name || newItem.menu_name.trim() === '') {
      alert('メニュー名を入力してください')
      return
    }

    try {
      const { error } = await supabase
        .from('menu_items')
        .insert({
          store_id: store.id,
          store_name: store.store_name,
          menu_name: newItem.menu_name,
          description: newItem.description || null,
          allergies_contains: (newItem.allergies_contains || []).map(id => id.toString()),
          allergies_share: (newItem.allergies_share || []).map(id => id.toString()),
          price: newItem.price || null,
          category: newItem.category || null,
          is_published: newItem.is_published ?? true,
          note: newItem.note || null,
        })

      if (error) {
        console.error('Supabase insert error:', error)
        throw error
      }

      await loadMenuItems()
      setIsCreatingNew(false)
      setNewItem({
        menu_name: '',
        description: '',
        price: undefined,
        category: '',
        allergies_contains: [],
      allergies_share: [],
        is_published: true,
        note: '',
      })
    } catch (err: any) {
      console.error('Error creating menu item:', err)
      alert(`メニュー項目の作成に失敗しました: ${err?.message || 'Unknown error'}`)
    }
  }

  const handleDelete = async (itemId: number) => {
    if (!confirm('このメニュー項目を削除しますか？')) {
      return
    }

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId)

      if (error) {
        console.error('Supabase delete error:', error)
        throw error
      }

      await loadMenuItems()
    } catch (err: any) {
      console.error('Error deleting menu item:', err)
      alert(`メニュー項目の削除に失敗しました: ${err?.message || 'Unknown error'}`)
    }
  }

  const handleTogglePublished = async (itemId: number, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_published: !currentValue })
        .eq('id', itemId)

      if (error) {
        console.error('Supabase update error:', error)
        throw error
      }

      await loadMenuItems()
    } catch (err: any) {
      console.error('Error toggling published status:', err)
      alert(`公開状態の更新に失敗しました: ${err?.message || 'Unknown error'}`)
    }
  }

  const handleSaveMenuField = async () => {
    if (!editingMenuField) return

    try {
      const updateData: any = {}
      
      if (editingMenuField.field === 'price') {
        updateData.price = editMenuValue ? parseFloat(editMenuValue) : null
      } else {
        updateData[editingMenuField.field] = editMenuValue || null
      }

      const { error, data } = await supabase
        .from('menu_items')
        .update(updateData)
        .eq('id', editingMenuField.itemId)
        .select()

      if (error) {
        console.error('Supabase update error:', error)
        throw error
      }

      await loadMenuItems()

      setEditingMenuField(null)
      setEditMenuValue('')
    } catch (err: any) {
      console.error('Error updating menu item:', err)
      alert(`メニュー項目の更新に失敗しました: ${err?.message || 'Unknown error'}`)
    }
  }

  const handleCancelEditMenuField = () => {
    setEditingMenuField(null)
    setEditMenuValue('')
  }

  const handleEditAllergies = (item: MenuItem) => {
    setEditingAllergies(item.id)
    setTempAllergiesContains([...(item.allergies_contains || [])])
    setTempAllergiesShare([...(item.allergies_share || [])])
  }

  const handleRemoveAllergy = (allergyId: number, level: 'contains' | 'share') => {
    if (level === 'contains') {
      setTempAllergiesContains(tempAllergiesContains.filter(id => id !== allergyId))
    } else {
      setTempAllergiesShare(tempAllergiesShare.filter(id => id !== allergyId))
    }
  }

  const handleAddAllergy = (allergyId: number, level: 'contains' | 'share') => {
    if (level === 'contains') {
      if (!tempAllergiesContains.includes(allergyId)) {
        setTempAllergiesContains([...tempAllergiesContains, allergyId])
      }
    } else {
      if (!tempAllergiesShare.includes(allergyId)) {
        setTempAllergiesShare([...tempAllergiesShare, allergyId])
      }
    }
  }

  const handleMoveAllergy = (allergyId: number, fromLevel: 'contains' | 'share', toLevel: 'contains' | 'share') => {
    handleRemoveAllergy(allergyId, fromLevel)
    handleAddAllergy(allergyId, toLevel)
  }

  const handleSaveAllergies = async (itemId: number) => {
    try {
      const { error, data } = await supabase
        .from('menu_items')
        .update({ 
          allergies_contains: tempAllergiesContains.map(id => id.toString()),
          allergies_share: tempAllergiesShare.map(id => id.toString())
        })
        .eq('id', itemId)
        .select()

      if (error) {
        console.error('Supabase update error:', error)
        throw error
      }

      await loadMenuItems()

      setEditingAllergies(null)
      setTempAllergiesContains([])
      setTempAllergiesShare([])
    } catch (err: any) {
      console.error('Error updating allergies:', err)
      alert(`アレルギー情報の更新に失敗しました: ${err?.message || 'Unknown error'}`)
    }
  }

  const handleCancelEditAllergies = () => {
    setEditingAllergies(null)
    setTempAllergiesContains([])
    setTempAllergiesShare([])
  }

  const getAllergyNames = (allergiesContains: number[], allergiesShare: number[]): string => {
    const containsNames = allergiesContains.map(id => {
      const allergy = COMMON_ALLERGIES.find((a: CommonAllergy) => a.id === id)
      return allergy ? `${allergy.ja} (含有)` : `不明 (${id})`
    })
    const shareNames = allergiesShare.map(id => {
      const allergy = COMMON_ALLERGIES.find((a: CommonAllergy) => a.id === id)
      return allergy ? `${allergy.ja} (共有)` : `不明 (${id})`
    })
    return [...containsNames, ...shareNames].join(', ')
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {store.store_name} - メニュー一覧
        </h2>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500">クリックすると編集できます</p>
          {onPdfUpload && (
            <button
              onClick={onPdfUpload}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              PDFから変換
            </button>
          )}
          {onCsvUpload && (
            <button
              onClick={onCsvUpload}
              className="px-3 py-1 text-sm bg-logo-blue text-white rounded hover:bg-blue-600 transition-colors"
            >
              CSVアップロード
            </button>
          )}
          <button
            onClick={handleCreateNew}
            className="px-3 py-1 text-sm bg-logo-green text-white rounded hover:bg-green-600 transition-colors"
          >
            新規登録
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
      {menuLoading ? (
        <div className="px-4 sm:px-6 py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-logo-orange mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">メニューを読み込み中...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  メニュー名
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  説明
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  アレルギー
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  価格
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  カテゴリ
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  公開
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  備考
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  削除
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* New Item Row */}
              {isCreatingNew && (
                <tr className="bg-blue-50">
                  <td className="px-4 sm:px-6 py-4"></td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    新規
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <input
                      type="text"
                      value={newItem.menu_name || ''}
                      onChange={(e) => setNewItem({ ...newItem, menu_name: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                      placeholder="メニュー名"
                      autoFocus
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm">
                    <textarea
                      value={newItem.description || ''}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm w-full min-h-[60px]"
                      rows={3}
                      placeholder="説明"
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-500">
                    <span className="text-xs">新規作成後編集</span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <input
                      type="number"
                      value={newItem.price || ''}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm w-24"
                      placeholder="価格"
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <input
                      type="text"
                      value={newItem.category || ''}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                      placeholder="カテゴリ"
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newItem.is_published ?? true}
                        onChange={(e) => setNewItem({ ...newItem, is_published: e.target.checked })}
                        className="w-4 h-4 text-logo-green border-gray-300 rounded focus:ring-logo-green"
                      />
                    </label>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm min-w-[250px]">
                    <input
                      type="text"
                      value={newItem.note || ''}
                      onChange={(e) => setNewItem({ ...newItem, note: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm w-full min-w-[200px]"
                      placeholder="備考"
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveNew}
                        className="px-2 py-1 bg-logo-green text-white text-xs rounded hover:bg-green-600"
                      >
                        保存
                      </button>
                      <button
                        onClick={handleCancelCreate}
                        className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                      >
                        キャンセル
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {menuItems.length === 0 && !isCreatingNew ? (
                <tr>
                  <td colSpan={9} className="px-4 sm:px-6 py-4 text-center text-sm text-gray-500">
                    メニュー項目が見つかりませんでした
                  </td>
                </tr>
              ) : (
                menuItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.id}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {editingMenuField?.itemId === item.id && editingMenuField.field === 'menu_name' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editMenuValue}
                            onChange={(e) => setEditMenuValue(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveMenuField}
                            className="px-2 py-1 bg-logo-green text-white text-xs rounded hover:bg-green-600"
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancelEditMenuField}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => handleEditMenuField(item, 'menu_name')}
                          className="cursor-pointer hover:text-logo-blue"
                        >
                          {item.menu_name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 max-w-xs">
                      {editingMenuField?.itemId === item.id && editingMenuField.field === 'description' ? (
                        <div className="flex items-start gap-2">
                          <textarea
                            value={editMenuValue}
                            onChange={(e) => setEditMenuValue(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm w-full min-h-[60px]"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={handleSaveMenuField}
                              className="px-2 py-1 bg-logo-green text-white text-xs rounded hover:bg-green-600 whitespace-nowrap"
                            >
                              保存
                            </button>
                            <button
                              onClick={handleCancelEditMenuField}
                              className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 whitespace-nowrap"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleEditMenuField(item, 'description')}
                          className="cursor-pointer hover:text-logo-blue block max-h-[60px] overflow-y-auto"
                          title={item.description || '-'}
                        >
                          {item.description || '-'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-500">
                      {editingAllergies === item.id ? (
                        <div className="space-y-2 min-w-[300px]">
                          {/* Contains allergies */}
                          <div>
                            <label className="text-xs font-semibold text-gray-700 mb-1 block">●含有:</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {tempAllergiesContains.length > 0 ? (
                                tempAllergiesContains.map((allergyId) => {
                                  const allergy = COMMON_ALLERGIES.find((a: CommonAllergy) => a.id === allergyId)
                                  return (
                                    <span
                                      key={allergyId}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs"
                                    >
                                      {allergy ? allergy.ja : `不明 (${allergyId})`}
                                      <button
                                        onClick={() => handleRemoveAllergy(allergyId, 'contains')}
                                        className="text-red-600 hover:text-red-800 font-bold"
                                      >
                                        ×
                                      </button>
                                      <button
                                        onClick={() => handleMoveAllergy(allergyId, 'contains', 'share')}
                                        className="text-xs text-blue-600 hover:text-blue-800"
                                        title="共有に移動"
                                      >
                                        →△
                                      </button>
                                    </span>
                                  )
                                })
                              ) : (
                                <span className="text-gray-400 text-xs">なし</span>
                              )}
                            </div>
                          </div>
                          {/* Share allergies */}
                          <div>
                            <label className="text-xs font-semibold text-gray-700 mb-1 block">△共有:</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {tempAllergiesShare.length > 0 ? (
                                tempAllergiesShare.map((allergyId) => {
                                  const allergy = COMMON_ALLERGIES.find((a: CommonAllergy) => a.id === allergyId)
                                  return (
                                    <span
                                      key={allergyId}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs"
                                    >
                                      {allergy ? allergy.ja : `不明 (${allergyId})`}
                                      <button
                                        onClick={() => handleRemoveAllergy(allergyId, 'share')}
                                        className="text-yellow-600 hover:text-yellow-800 font-bold"
                                      >
                                        ×
                                      </button>
                                      <button
                                        onClick={() => handleMoveAllergy(allergyId, 'share', 'contains')}
                                        className="text-xs text-blue-600 hover:text-blue-800"
                                        title="含有に移動"
                                      >
                                        →●
                                      </button>
                                    </span>
                                  )
                                })
                              ) : (
                                <span className="text-gray-400 text-xs">なし</span>
                              )}
                            </div>
                          </div>
                          {/* Add new allergy dropdown */}
                          <div className="flex items-center gap-2">
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  const [id, level] = e.target.value.split(':')
                                  handleAddAllergy(Number(id), level as 'contains' | 'share')
                                  e.target.value = ''
                                }
                              }}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="">新しいアレルギーを追加</option>
                              {COMMON_ALLERGIES.filter(
                                (allergy: CommonAllergy) => 
                                  !tempAllergiesContains.includes(allergy.id) && 
                                  !tempAllergiesShare.includes(allergy.id)
                              ).map((allergy: CommonAllergy) => (
                                <>
                                  <option key={`${allergy.id}:contains`} value={`${allergy.id}:contains`}>
                                    {allergy.ja} (●含有)
                                  </option>
                                  <option key={`${allergy.id}:share`} value={`${allergy.id}:share`}>
                                    {allergy.ja} (△共有)
                                  </option>
                                </>
                              ))}
                            </select>
                          </div>
                          {/* Save and Cancel buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveAllergies(item.id)}
                              className="px-2 py-1 bg-logo-green text-white text-xs rounded hover:bg-green-600"
                            >
                              保存
                            </button>
                            <button
                              onClick={handleCancelEditAllergies}
                              className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleEditAllergies(item)}
                          className="cursor-pointer hover:text-logo-blue"
                        >
                          {(item.allergies_contains?.length > 0 || item.allergies_share?.length > 0) ? (
                            <div className="flex flex-wrap gap-1 max-h-[48px] overflow-hidden">
                              {/* Contains allergies */}
                              {item.allergies_contains?.map((allergyId) => {
                                const allergy = COMMON_ALLERGIES.find((a: CommonAllergy) => a.id === allergyId)
                                return (
                                  <span
                                    key={`contains-${allergyId}`}
                                    className="inline-block px-2 py-1 bg-red-50 text-red-700 rounded text-xs whitespace-nowrap"
                                    title="含有"
                                  >
                                    {allergy ? `${allergy.ja} ●` : `不明 (${allergyId})`}
                                  </span>
                                )
                              })}
                              {/* Share allergies */}
                              {item.allergies_share?.map((allergyId) => {
                                const allergy = COMMON_ALLERGIES.find((a: CommonAllergy) => a.id === allergyId)
                                return (
                                  <span
                                    key={`share-${allergyId}`}
                                    className="inline-block px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs whitespace-nowrap"
                                    title="共有設備"
                                  >
                                    {allergy ? `${allergy.ja} △` : `不明 (${allergyId})`}
                                  </span>
                                )
                              })}
                            </div>
                          ) : (
                            <span className="text-green-600">なし</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingMenuField?.itemId === item.id && editingMenuField.field === 'price' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editMenuValue}
                            onChange={(e) => setEditMenuValue(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm w-24"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveMenuField}
                            className="px-2 py-1 bg-logo-green text-white text-xs rounded hover:bg-green-600"
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancelEditMenuField}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => handleEditMenuField(item, 'price')}
                          className="cursor-pointer hover:text-logo-blue"
                        >
                          {item.price ? `¥${item.price.toLocaleString()}` : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingMenuField?.itemId === item.id && editingMenuField.field === 'category' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editMenuValue}
                            onChange={(e) => setEditMenuValue(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveMenuField}
                            className="px-2 py-1 bg-logo-green text-white text-xs rounded hover:bg-green-600"
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancelEditMenuField}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => handleEditMenuField(item, 'category')}
                          className="cursor-pointer hover:text-logo-blue"
                        >
                          {item.category || '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.is_published ?? true}
                          onChange={() => handleTogglePublished(item.id, item.is_published ?? true)}
                          className="w-4 h-4 text-logo-green border-gray-300 rounded focus:ring-logo-green"
                        />
                      </label>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 min-w-[250px]">
                      {editingMenuField?.itemId === item.id && editingMenuField.field === 'note' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editMenuValue}
                            onChange={(e) => setEditMenuValue(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm w-full min-w-[200px]"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveMenuField}
                            className="px-2 py-1 bg-logo-green text-white text-xs rounded hover:bg-green-600 whitespace-nowrap"
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancelEditMenuField}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 whitespace-nowrap"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => handleEditMenuField(item, 'note')}
                          className="cursor-pointer hover:text-logo-blue block min-w-[200px]"
                          title={item.note || '-'}
                        >
                          {item.note || '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="削除"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

