import { supabase } from '@/lib/supabase/client'
import type { Allergy } from '@/lib/storage'
import { storageService } from '@/lib/storage'

export const allergyService = {
  // Save allergies (works for both guest and authenticated)
  saveAllergies: async (allergies: Allergy[], isAuthenticated: boolean): Promise<void> => {
    // Always save to localStorage first (for offline access)
    storageService.saveAllergies(allergies)

    // Only sync to Supabase if authenticated
    if (isAuthenticated) {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.warn('User not authenticated, saving to localStorage only')
          return
        }

        const userId = user.id

        // Delete existing allergies for this user
        const { error: deleteError } = await supabase
          .from('user_allergies')
          .delete()
          .eq('user_id', userId)

        if (deleteError) {
          console.error('Error deleting old allergies:', deleteError)
        }

        // Insert new allergies
        if (allergies.length > 0) {
          const allergiesToInsert = allergies.map(allergy => ({
            user_id: userId,
            allergy_id: allergy.allergyId,
            created_at: allergy.createdAt,
          }))

          const { error: insertError } = await supabase
            .from('user_allergies')
            .insert(allergiesToInsert)

          if (insertError) {
            throw insertError
          }
        }
      } catch (error) {
        console.error('Error saving allergies to Supabase:', error)
        // Don't throw - localStorage backup is already saved
      }
    }
  },

  // Get allergies (works for both guest and authenticated)
  getAllergies: async (isAuthenticated: boolean): Promise<Allergy[]> => {
    if (isAuthenticated) {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          // Fallback to localStorage
          return storageService.getAllergies()
        }

        const userId = user.id

        const { data, error } = await supabase
          .from('user_allergies')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching from Supabase, using localStorage:', error)
          return storageService.getAllergies()
        }

        if (data && data.length > 0) {
          const allergies = data.map(item => ({
            id: item.id.toString(),
            allergyId: item.allergy_id,
            createdAt: item.created_at,
          }))
          
          // Sync to localStorage as backup
          storageService.saveAllergies(allergies)
          return allergies
        }
      } catch (error) {
        console.error('Error fetching allergies from Supabase:', error)
      }
    }

    // For guests or on error, use localStorage
    return storageService.getAllergies()
  },

  // Migrate guest data to authenticated account
  migrateGuestData: async (): Promise<void> => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Get guest data from localStorage
      const guestAllergies = storageService.getAllergies()
      
      if (guestAllergies.length === 0) {
        return // Nothing to migrate
      }

      // Save to Supabase
      await allergyService.saveAllergies(guestAllergies, true)
      
      console.log(`Migrated ${guestAllergies.length} allergies to cloud`)
    } catch (error) {
      console.error('Error migrating guest data:', error)
      throw error
    }
  },

  // Sync: Save to both localStorage and Supabase (if authenticated)
  syncAllergies: async (allergies: Allergy[], isAuthenticated: boolean): Promise<void> => {
    await allergyService.saveAllergies(allergies, isAuthenticated)
  },
}

