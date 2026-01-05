import { supabase } from '@/lib/supabase/client'
import type { MenuItem, MenuItemMatch, Store } from '@/types/menu.types'
import type { Allergy } from '@/lib/storage'

export const getAllStores = async (): Promise<Store[]> => {
  try {
    const { data, error } = await supabase.from('stores').select('*').order('store_name', { ascending: true })
    if (error) throw error
    return (data || []) as Store[]
  } catch (err) {
    console.error('getAllStores error', err)
    return []
  }
}

export const getStoreByName = async (storeName: string): Promise<Store | null> => {
  try {
    const { data, error } = await supabase.from('stores').select('*').eq('store_name', storeName).single()
    if (error) throw error
    return data as Store
  } catch (err) {
    console.error('getStoreByName error', err)
    return null
  }
}

export const getStoreById = async (storeId: number): Promise<Store | null> => {
  try {
    const { data, error } = await supabase.from('stores').select('*').eq('id', storeId).single()
    if (error) throw error
    return data as Store
  } catch (err) {
    console.error('getStoreById error', err)
    return null
  }
}

export const getAllMenuItems = async (): Promise<MenuItem[]> => {
  try {
    const { data, error } = await supabase.from('menu_items').select('*').order('store_name', { ascending: true }).order('menu_name', { ascending: true })
    if (error) throw error
    // Convert DECIMAL[] to number[]
    return (data || []).map((r: any) => {
      let allergies_contains: number[] = []
      let allergies_share: number[] = []
      
      if (r.allergies_contains) {
        allergies_contains = Array.isArray(r.allergies_contains) 
          ? r.allergies_contains.map((id: any) => Number(id))
          : []
      }
      
      if (r.allergies_share) {
        allergies_share = Array.isArray(r.allergies_share)
          ? r.allergies_share.map((id: any) => Number(id))
          : []
      }
      
      return { 
        ...(r as object), 
        allergies_contains,
        allergies_share
      } as MenuItem
    })
  } catch (err) {
    console.error('getAllMenuItems error', err)
    return []
  }
}

export const getMenuItemsByStore = async (storeName: string): Promise<MenuItem[]> => {
  try {
    const { data, error } = await supabase.from('menu_items').select('*').eq('store_name', storeName).order('menu_name', { ascending: true })
    if (error) throw error
    // Convert DECIMAL[] to number[]
    return (data || []).map((r: any) => {
      let allergies_contains: number[] = []
      let allergies_share: number[] = []
      
      if (r.allergies_contains) {
        allergies_contains = Array.isArray(r.allergies_contains) 
          ? r.allergies_contains.map((id: any) => Number(id))
          : []
      }
      
      if (r.allergies_share) {
        allergies_share = Array.isArray(r.allergies_share)
          ? r.allergies_share.map((id: any) => Number(id))
          : []
      }
      
      return { 
        ...(r as object), 
        allergies_contains,
        allergies_share
      } as MenuItem
    })
  } catch (err) {
    console.error('getMenuItemsByStore error', err)
    return []
  }
}

export const matchMenuItems = (menuItems: MenuItem[], userAllergies: Allergy[]): MenuItemMatch[] => {
  const userAllergyIds = userAllergies.map(u => u.allergyId)
  const matches: MenuItemMatch[] = []

  for (const item of menuItems) {
    const matchedContainsIds: number[] = []
    const matchedShareIds: number[] = []
    
    // Check contains allergies
    for (const allergyId of (item.allergies_contains || [])) {
      if (userAllergyIds.includes(allergyId)) {
        if (!matchedContainsIds.includes(allergyId)) {
          matchedContainsIds.push(allergyId)
        }
      }
    }
    
    // Check share allergies
    for (const allergyId of (item.allergies_share || [])) {
      if (userAllergyIds.includes(allergyId)) {
        if (!matchedShareIds.includes(allergyId)) {
          matchedShareIds.push(allergyId)
        }
      }
    }
    
    // Combine all matched IDs
    const matchedIds = [...matchedContainsIds, ...matchedShareIds]
    
    if (matchedIds.length > 0) {
      matches.push({
        menuItem: item,
        matchedAllergyIds: matchedIds,
        matchedContainsIds: matchedContainsIds,
        matchedShareIds: matchedShareIds,
        userAllergyIds: userAllergyIds.filter(id => matchedIds.includes(id)),
      })
    }
  }

  return matches
}



