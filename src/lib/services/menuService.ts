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
    return (data || []).map((r: any) => ({ 
      ...(r as object), 
      allergies: (r.allergies || []).map((a: any) => Number(a))
    })) as MenuItem[]
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
    return (data || []).map((r: any) => ({ 
      ...(r as object), 
      allergies: (r.allergies || []).map((a: any) => Number(a))
    })) as MenuItem[]
  } catch (err) {
    console.error('getMenuItemsByStore error', err)
    return []
  }
}

export const matchMenuItems = (menuItems: MenuItem[], userAllergies: Allergy[]): MenuItemMatch[] => {
  const userAllergyIds = userAllergies.map(u => u.allergyId)
  const matches: MenuItemMatch[] = []

  for (const item of menuItems) {
    const matchedIds: number[] = []
    for (const menuAllergyId of (item.allergies || [])) {
      if (userAllergyIds.includes(menuAllergyId)) {
        if (!matchedIds.includes(menuAllergyId)) {
          matchedIds.push(menuAllergyId)
        }
      }
    }
    if (matchedIds.length > 0) {
      matches.push({
        menuItem: item,
        matchedAllergyIds: matchedIds,
        userAllergyIds: userAllergyIds.filter(id => matchedIds.includes(id)),
      })
    }
  }

  return matches
}



