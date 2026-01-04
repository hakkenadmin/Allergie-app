'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { getAllStores } from '@/lib/services/menuService'
import { userRoleService } from '@/lib/services/userRoleService'
import { supabase } from '@/lib/supabase/client'
import MenuTable from '@/components/admin/MenuTable'
import CsvUploader from '@/components/admin/CsvUploader'
import type { Store } from '@/types/menu.types'

export default function AdminPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [users, setUsers] = useState<Array<{ id: string; email: string }>>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showCsvUploader, setShowCsvUploader] = useState(false)
  const [csvUploadStore, setCsvUploadStore] = useState<Store | null>(null)
  const [menuTableRefreshKey, setMenuTableRefreshKey] = useState(0)

  // Check if user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (authLoading) return

      if (!user) {
        // Not logged in, redirect to index
        router.push('/')
        return
      }

      const isAdmin = await userRoleService.isAdmin(user.id)
      
      if (!isAdmin) {
        // Not admin, redirect to index
        router.push('/')
        return
      }

      // User is admin, allow access
      setCheckingAdmin(false)
      loadStores()
    }

    checkAdminAccess()
  }, [user, authLoading, router])

  const loadStores = async () => {
    setLoading(true)
    try {
      const storeList = await getAllStores()
      setStores(storeList)
    } catch (err) {
      console.error('Error loading stores:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewMenu = (store: Store) => {
    setSelectedStore(store)
  }

  const handleEditStore = (store: Store) => {
    setEditingStore(store)
  }

  const handleSaveStore = async (updatedStore: Store) => {
    try {
      const { error, data } = await supabase
        .from('stores')
        .update({
          store_name: updatedStore.store_name,
          description: updatedStore.description,
          managing_company: updatedStore.managing_company,
          address: updatedStore.address,
          phone: updatedStore.phone,
          website: updatedStore.website,
          verified: updatedStore.verified,
        })
        .eq('id', updatedStore.id)
        .select()

      if (error) {
        console.error('Supabase update error:', error)
        throw error
      }

      await loadStores()
      setEditingStore(null)
    } catch (err: any) {
      console.error('Error updating store:', err)
      alert(`店舗の更新に失敗しました: ${err?.message || 'Unknown error'}`)
    }
  }

  const handleCancelEditStore = () => {
    setEditingStore(null)
  }

  const handleCsvUploadComplete = async () => {
    // Reload stores to refresh data
    await loadStores()
    // Force MenuTable to refresh by updating refreshKey
    setMenuTableRefreshKey(prev => prev + 1)
  }

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      // Try to use database function first
      console.log('🔍 Calling get_users_with_emails RPC function...')
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_users_with_emails')
      
      // Log raw JSON response
      console.log('📦 Raw RPC Response:', JSON.stringify({ data: rpcData, error: rpcError }, null, 2))
      console.log('📊 RPC Data:', rpcData)
      console.log('❌ RPC Error:', rpcError)
      
      if (!rpcError && rpcData && rpcData.length > 0) {
        console.log('✅ Loaded users from RPC:', rpcData.length)
        console.log('👥 Users list:', JSON.stringify(rpcData, null, 2))
        setUsers(rpcData)
        return
      }

      // Log error if RPC failed
      if (rpcError) {
        console.error('❌ RPC error details:', JSON.stringify(rpcError, null, 2))
        console.error('❌ RPC error message:', rpcError.message)
        console.error('❌ RPC error code:', rpcError.code)
        console.error('❌ RPC error hint:', rpcError.hint)
      }
      
      // If RPC returned empty array, log it
      if (!rpcError && rpcData && rpcData.length === 0) {
        console.warn('⚠️ RPC returned empty array - no users found in auth.users')
      }

      // Fallback: Get all user IDs from auth.users via a different approach
      // Since we can't directly query auth.users, we'll get users from user_profiles
      // and also check if there are users without profiles
      console.log('🔄 Falling back to user_profiles query...')
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
      
      console.log('📦 Raw Profiles Response:', JSON.stringify({ data: profiles, error: profileError }, null, 2))
      
      const usersList: Array<{ id: string; email: string }> = []
      
      // Add current user if exists
      if (user) {
        usersList.push({ id: user.id, email: user.email || 'No email' })
      }

      // Add other users from profiles
      if (!profileError && profiles) {
        profiles.forEach(profile => {
          if (!usersList.find(u => u.id === profile.id)) {
            // We'll show the ID since we can't get email without the function
            usersList.push({ id: profile.id, email: `User ${profile.id.substring(0, 8)}...` })
          }
        })
      }

      // If we have users, set them
      if (usersList.length > 0) {
        console.log('✅ Loaded users from fallback:', usersList.length)
        console.log('👥 Fallback users list:', JSON.stringify(usersList, null, 2))
        setUsers(usersList)
      } else {
        console.warn('⚠️ No users found. Make sure get_users_with_emails() function exists in Supabase.')
        setUsers([])
      }
    } catch (err) {
      console.error('💥 Error loading users:', err)
      console.error('💥 Error details:', JSON.stringify(err, null, 2))
      // Set empty array on error
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!selectedUserId) {
      alert('ユーザーを選択してください')
      return
    }

    try {
      const success = await userRoleService.setAdmin(selectedUserId, true)
      if (success) {
        alert('管理者を追加しました')
        setSelectedUserId('')
        // Reload users to refresh admin status
        await loadUsers()
      } else {
        alert('管理者の追加に失敗しました')
      }
    } catch (err) {
      console.error('Error adding admin:', err)
      alert('管理者の追加に失敗しました')
    }
  }

  // Show loading while checking admin status or auth loading
  if (authLoading || checkingAdmin) {
    return (
      <main className="flex-1 flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-logo-orange mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">認証を確認中...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 flex flex-col">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">管理者ページ</h1>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-logo-orange mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">読み込み中...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Add Admin Section */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">管理者追加</h2>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ユーザーを選択
                    </label>
                    {loadingUsers ? (
                      <div className="text-sm text-gray-500">読み込み中...</div>
                    ) : (
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-logo-orange"
                      >
                        <option value="">ユーザーを選択してください</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.email}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <button
                    onClick={handleAddAdmin}
                    disabled={!selectedUserId || loadingUsers}
                    className="px-4 py-2 bg-logo-orange text-white rounded hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    管理者として追加
                  </button>
                </div>
              </div>

              {/* Stores Table */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">店舗一覧</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          店舗名
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          説明
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          運営会社
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          認証済み
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stores.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 sm:px-6 py-4 text-center text-sm text-gray-500">
                            店舗が登録されていません
                          </td>
                        </tr>
                      ) : (
                        stores.map((store) => (
                          <tr key={store.id} className="hover:bg-gray-50">
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {store.id}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {store.store_name}
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                              {store.description || '-'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {store.managing_company || '-'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                              {store.verified === 'y' ? (
                                <span className="px-2 py-1 text-xs font-semibold bg-logo-green text-white rounded">
                                  認証済み
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-semibold bg-gray-200 text-gray-700 rounded">
                                  未認証
                                </span>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleViewMenu(store)}
                                  className="px-3 py-1 bg-logo-orange text-white rounded hover:bg-orange-600 transition-colors"
                                >
                                  表示
                                </button>
                                <button
                                  onClick={() => handleEditStore(store)}
                                  className="px-3 py-1 bg-logo-blue text-white rounded hover:bg-blue-600 transition-colors"
                                >
                                  編集
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Store Edit Screen */}
              {editingStore && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">店舗編集: {editingStore.store_name}</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">店舗名</label>
                      <input
                        type="text"
                        value={editingStore.store_name}
                        onChange={(e) => setEditingStore({ ...editingStore, store_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                      <textarea
                        value={editingStore.description || ''}
                        onChange={(e) => setEditingStore({ ...editingStore, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">運営会社</label>
                      <input
                        type="text"
                        value={editingStore.managing_company || ''}
                        onChange={(e) => setEditingStore({ ...editingStore, managing_company: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
                      <input
                        type="text"
                        value={editingStore.address || ''}
                        onChange={(e) => setEditingStore({ ...editingStore, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                      <input
                        type="text"
                        value={editingStore.phone || ''}
                        onChange={(e) => setEditingStore({ ...editingStore, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ウェブサイト</label>
                      <input
                        type="text"
                        value={editingStore.website || ''}
                        onChange={(e) => setEditingStore({ ...editingStore, website: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">認証済み</label>
                      <select
                        value={editingStore.verified || 'n'}
                        onChange={(e) => setEditingStore({ ...editingStore, verified: e.target.value as 'y' | 'n' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="n">未認証</option>
                        <option value="y">認証済み</option>
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={handleCancelEditStore}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleSaveStore(editingStore)}
                        className="px-4 py-2 bg-logo-green text-white rounded hover:bg-green-600 transition-colors"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Menu Items Table - Show when store is selected */}
              {selectedStore && (
                <MenuTable 
                  store={selectedStore} 
                  onClose={() => setSelectedStore(null)}
                  refreshKey={menuTableRefreshKey}
                  onCsvUpload={() => {
                    setCsvUploadStore(selectedStore)
                    setShowCsvUploader(true)
                  }}
                />
              )}
            </div>
          )}
        </div>
        <Footer />
      </div>

      {/* CSV Uploader Modal */}
      {showCsvUploader && csvUploadStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CsvUploader
              store={csvUploadStore}
              onClose={() => {
                setShowCsvUploader(false)
                setCsvUploadStore(null)
              }}
              onUploadComplete={handleCsvUploadComplete}
            />
          </div>
        </div>
      )}
    </main>
  )
}

