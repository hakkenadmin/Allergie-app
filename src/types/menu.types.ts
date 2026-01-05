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

export type AllergyLevel = 'contains' | 'share' | 'none'

export interface MenuItem {
  id: number
  store_id?: number
  store_name: string
  menu_name: string
  description?: string
  allergies_contains: number[]  // Array of allergy IDs that contain allergen
  allergies_share: number[]     // Array of allergy IDs that share equipment
  price?: number
  category?: string
  is_published?: boolean
  note?: string | null
  created_at: string
  updated_at: string
}

export interface MenuItemMatch {
  menuItem: MenuItem
  matchedAllergyIds: number[]  // Array of matched allergy IDs (all matches)
  matchedContainsIds: number[] // Array of matched allergy IDs from allergies_contains
  matchedShareIds: number[]     // Array of matched allergy IDs from allergies_share
  userAllergyIds: number[]     // Array of user allergy IDs that matched
}



