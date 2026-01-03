'use client'

import { useAuth } from '@/contexts/AuthContext'
import { getFeatureFlags } from '@/lib/features'

interface FeatureItemProps {
  name: string
  description: string
  enabled: boolean
}

function FeatureItem({ name, description, enabled }: FeatureItemProps) {
  return (
    <div className={`p-4 rounded-lg border-2 ${enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
          {enabled ? (
            <span className="text-white text-sm">✓</span>
          ) : (
            <span className="text-white text-sm">✗</span>
          )}
        </div>
        <div>
          <h4 className={`font-semibold ${enabled ? 'text-green-800' : 'text-gray-500'}`}>
            {name}
          </h4>
          <p className={`text-sm mt-1 ${enabled ? 'text-green-700' : 'text-gray-500'}`}>
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PremiumFeatures() {
  const { isGuest } = useAuth()
  const features = getFeatureFlags(!isGuest)

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4">Features</h3>
      <div className="space-y-3">
        <FeatureItem
          name="Cloud Sync"
          description="Sync your allergies across all devices"
          enabled={features.cloudSync}
        />
        <FeatureItem
          name="Multiple Devices"
          description="Access your data from any device"
          enabled={features.multipleDevices}
        />
        <FeatureItem
          name="Data Export"
          description="Export your allergy data as PDF or CSV"
          enabled={features.exportData}
        />
        <FeatureItem
          name="Advanced Analytics"
          description="Track and analyze your allergy patterns"
          enabled={features.advancedAnalytics}
        />
        <FeatureItem
          name="Reminders"
          description="Get notifications for medication and checkups"
          enabled={features.reminders}
        />
        <FeatureItem
          name="Share with Doctor"
          description="Securely share your allergy information with healthcare providers"
          enabled={features.shareWithDoctor}
        />
      </div>
    </div>
  )
}


