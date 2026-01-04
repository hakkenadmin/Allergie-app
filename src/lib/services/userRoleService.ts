import { supabase } from '@/lib/supabase/client'
import type { UserProfile } from '@/types/user.types'

export const userRoleService = {
  // Get user profile
  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error getting user profile:', error)
        return null
      }

      return data as UserProfile
    } catch (err) {
      console.error('Error getting user profile:', err)
      return null
    }
  },

  // Check if user is Admin
  isAdmin: async (userId: string): Promise<boolean> => {
    try {
      const profile = await userRoleService.getUserProfile(userId)
      return profile?.is_admin || false
    } catch (err) {
      console.error('Error checking admin status:', err)
      return false
    }
  },

  // Check if user is Store-Admin
  isStoreAdmin: async (userId: string): Promise<boolean> => {
    try {
      const profile = await userRoleService.getUserProfile(userId)
      return profile?.is_store_admin || false
    } catch (err) {
      console.error('Error checking store admin status:', err)
      return false
    }
  },

  // Get store ID for Store-Admin
  getStoreAdminStoreId: async (userId: string): Promise<number | null> => {
    try {
      const profile = await userRoleService.getUserProfile(userId)
      return profile?.store_id || null
    } catch (err) {
      console.error('Error getting store admin store ID:', err)
      return null
    }
  },

  // Set admin status (Admin only)
  setAdmin: async (userId: string, isAdmin: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({ id: userId, is_admin: isAdmin }, { onConflict: 'id' })

      if (error) {
        console.error('Error setting admin status:', error)
        return false
      }

      return true
    } catch (err) {
      console.error('Error setting admin status:', err)
      return false
    }
  },

  // Set store admin status (Admin only)
  setStoreAdmin: async (userId: string, isStoreAdmin: boolean, storeId?: number): Promise<boolean> => {
    try {
      const updateData: any = {
        id: userId,
        is_store_admin: isStoreAdmin,
      }

      if (isStoreAdmin && storeId) {
        updateData.store_id = storeId
      } else if (!isStoreAdmin) {
        updateData.store_id = null
      }

      const { error } = await supabase
        .from('user_profiles')
        .upsert(updateData, { onConflict: 'id' })

      if (error) {
        console.error('Error setting store admin status:', error)
        return false
      }

      return true
    } catch (err) {
      console.error('Error setting store admin status:', err)
      return false
    }
  },
}

