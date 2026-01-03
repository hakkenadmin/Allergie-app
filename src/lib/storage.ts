const STORAGE_KEY = 'allergie_user_allergies'

export interface Allergy {
  id: string
  allergyId: number  // References COMMON_ALLERGIES.id
  createdAt: string
}

export const storageService = {
  // Save allergies to localStorage
  saveAllergies: (allergies: Allergy[]): void => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allergies))
      } catch (error) {
        console.error('Error saving to localStorage:', error)
      }
    }
  },

  // Get allergies from localStorage
  getAllergies: (): Allergy[] => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
      } catch (error) {
        console.error('Error reading from localStorage:', error)
        return []
      }
    }
    return []
  },

  // Add a single allergy
  addAllergy: (allergy: Allergy): void => {
    const allergies = storageService.getAllergies()
    allergies.push(allergy)
    storageService.saveAllergies(allergies)
  },

  // Remove an allergy
  removeAllergy: (id: string): void => {
    const allergies = storageService.getAllergies()
    const filtered = allergies.filter(a => a.id !== id)
    storageService.saveAllergies(filtered)
  },

  // Update an allergy
  updateAllergy: (id: string, updates: Partial<Allergy>): void => {
    const allergies = storageService.getAllergies()
    const updated = allergies.map(a => a.id === id ? { ...a, ...updates } : a)
    storageService.saveAllergies(updated)
  },

  // Clear all allergies
  clearAllergies: (): void => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (error) {
        console.error('Error clearing localStorage:', error)
      }
    }
  },
}

