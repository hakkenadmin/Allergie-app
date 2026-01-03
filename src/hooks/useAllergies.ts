'use client'

import { useState, useEffect } from 'react'
import type { Allergy } from '@/lib/storage'
import { storageService } from '@/lib/storage'
import { allergyService } from '@/lib/services/allergyService'
import { useAuth } from '@/contexts/AuthContext'
import { COMMON_ALLERGIES } from '@/data/commonAllergies'

export const useAllergies = () => {
  const { user, isGuest } = useAuth()
  const [allergies, setAllergies] = useState<Allergy[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const isAuthenticated = !!user

  // Load allergies on mount
  useEffect(() => {
    loadAllergies()
  }, [isAuthenticated])

  const loadAllergies = async () => {
    setLoading(true)
    try {
      const loadedAllergies = await allergyService.getAllergies(isAuthenticated)
      setAllergies(loadedAllergies)
    } catch (error) {
      console.error('Error loading allergies:', error)
    } finally {
      setLoading(false)
    }
  }

  const addAllergy = async (allergyId: number) => {
    // Validate that allergyId exists in COMMON_ALLERGIES
    const commonAllergy = COMMON_ALLERGIES.find(a => a.id === allergyId)
    if (!commonAllergy) {
      console.error(`Allergy ID ${allergyId} not found in COMMON_ALLERGIES`)
      return
    }

    // Prevent duplicates
    const exists = allergies.some(a => a.allergyId === allergyId)
    if (exists) return

    const newAllergy: Allergy = {
      id: `allergy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      allergyId,
      createdAt: new Date().toISOString(),
    }

    const updatedAllergies = [...allergies, newAllergy]
    setAllergies(updatedAllergies)

    setSyncing(true)
    try {
      await allergyService.syncAllergies(updatedAllergies, isAuthenticated)
    } catch (error) {
      console.error('Error syncing allergy:', error)
    } finally {
      setSyncing(false)
    }
  }

  const removeAllergy = async (id: string) => {
    const updatedAllergies = allergies.filter(a => a.id !== id)
    setAllergies(updatedAllergies)

    setSyncing(true)
    try {
      await allergyService.syncAllergies(updatedAllergies, isAuthenticated)
    } catch (error) {
      console.error('Error syncing allergy removal:', error)
    } finally {
      setSyncing(false)
    }
  }

  const updateAllergy = async (id: string, updates: Partial<Allergy>) => {
    const updatedAllergies = allergies.map(a =>
      a.id === id ? { ...a, ...updates } : a
    )
    setAllergies(updatedAllergies)

    setSyncing(true)
    try {
      await allergyService.syncAllergies(updatedAllergies, isAuthenticated)
    } catch (error) {
      console.error('Error syncing allergy update:', error)
    } finally {
      setSyncing(false)
    }
  }

  return {
    allergies,
    loading,
    syncing,
    isAuthenticated,
    addAllergy,
    removeAllergy,
    updateAllergy,
    reload: loadAllergies,
  }
}

