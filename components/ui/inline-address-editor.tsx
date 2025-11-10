'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Edit, Save, X, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Address {
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  country?: string | null
  phone?: string | null
}

interface InlineAddressEditorProps {
  userId: string
  workspaceSlug: string
  initialAddress: Address
  isAdmin?: boolean
  showRetryButton?: boolean
  onAddressUpdated?: () => void
}

export function InlineAddressEditor({
  userId,
  workspaceSlug,
  initialAddress,
  isAdmin = false,
  showRetryButton = false,
  onAddressUpdated,
}: InlineAddressEditorProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState<Address>(initialAddress)

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/participants/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
          phone: formData.phone,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update address')
      }

      const data = await response.json()
      setSuccess('Address updated successfully!')
      setIsEditing(false)

      // Call callback if provided
      if (onAddressUpdated) {
        onAddressUpdated()
      }

      // Refresh the page data
      router.refresh()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update address')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData(initialAddress)
    setIsEditing(false)
    setError(null)
  }

  const isAddressComplete = () => {
    return !!(
      formData.addressLine1 &&
      formData.city &&
      formData.state &&
      formData.zipCode &&
      formData.country
    )
  }

  const getMissingFields = () => {
    const missing: string[] = []
    if (!formData.addressLine1) missing.push('Street Address')
    if (!formData.city) missing.push('City')
    if (!formData.state) missing.push('State')
    if (!formData.zipCode) missing.push('Zip Code')
    if (!formData.country) missing.push('Country')
    return missing
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Shipping Address
            </CardTitle>
            <CardDescription>
              Required for catalog reward issuance
            </CardDescription>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Address
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 text-green-900 border-green-200">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {!isAddressComplete() && !isEditing && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Missing required fields: {getMissingFields().join(', ')}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="addressLine1">Street Address *</Label>
            {isEditing ? (
              <Input
                id="addressLine1"
                value={formData.addressLine1 || ''}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                placeholder="123 Main St"
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">
                {formData.addressLine1 || <span className="text-gray-400">Not set</span>}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="addressLine2">Apartment, suite, etc.</Label>
            {isEditing ? (
              <Input
                id="addressLine2"
                value={formData.addressLine2 || ''}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                placeholder="Apt 4B"
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">
                {formData.addressLine2 || <span className="text-gray-400">Not set</span>}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="city">City *</Label>
            {isEditing ? (
              <Input
                id="city"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="San Francisco"
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">
                {formData.city || <span className="text-gray-400">Not set</span>}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="state">State *</Label>
            {isEditing ? (
              <Input
                id="state"
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                placeholder="CA"
                maxLength={2}
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">
                {formData.state || <span className="text-gray-400">Not set</span>}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="zipCode">Zip Code *</Label>
            {isEditing ? (
              <Input
                id="zipCode"
                value={formData.zipCode || ''}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="94103"
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">
                {formData.zipCode || <span className="text-gray-400">Not set</span>}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="country">Country *</Label>
            {isEditing ? (
              <Input
                id="country"
                value={formData.country || ''}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="USA"
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">
                {formData.country || <span className="text-gray-400">Not set</span>}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="phone">Phone Number</Label>
            {isEditing ? (
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">
                {formData.phone || <span className="text-gray-400">Not set</span>}
              </p>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-coral-500 hover:bg-coral-600"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Address'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
