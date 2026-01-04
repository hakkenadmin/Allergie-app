export interface UserProfile {
  id: string  // UUID from auth.users
  is_admin: boolean
  is_store_admin: boolean
  store_id?: number | null
  created_at: string
  updated_at: string
}

