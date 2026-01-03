export interface Store {
  id: number
  store_name: string
  description?: string
  managing_company?: string
  address?: string
  phone?: string
  website?: string
  verified?: 'y' | 'n'
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: number
  store_id?: number
  store_name: string
  menu_name: string
  description?: string
  allergies: number[]  // Array of allergy IDs from COMMON_ALLERGIES
  price?: number
  category?: string
  created_at: string
  updated_at: string
}

export interface MenuItemMatch {
  menuItem: MenuItem
  matchedAllergyIds: number[]  // Array of matched allergy IDs
  userAllergyIds: number[]       // Array of user allergy IDs that matched
}



