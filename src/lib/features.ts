export interface FeatureFlags {
  cloudSync: boolean
  multipleDevices: boolean
  exportData: boolean
  advancedAnalytics: boolean
  reminders: boolean
  shareWithDoctor: boolean
}

export const getFeatureFlags = (isAuthenticated: boolean): FeatureFlags => {
  if (isAuthenticated) {
    return {
      cloudSync: true,
      multipleDevices: true,
      exportData: true,
      advancedAnalytics: true,
      reminders: true,
      shareWithDoctor: true,
    }
  }

  // Guest features (limited)
  return {
    cloudSync: false,
    multipleDevices: false,
    exportData: false,
    advancedAnalytics: false,
    reminders: false,
    shareWithDoctor: false,
  }
}


