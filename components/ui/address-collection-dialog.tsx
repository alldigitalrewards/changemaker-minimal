'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, MapPin } from 'lucide-react'

interface AddressCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (address: AddressData) => Promise<void>
  initialAddress?: Partial<AddressData>
}

export interface AddressData {
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zipCode: string
  country: string
  phone: string
}

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

export function AddressCollectionDialog({
  open,
  onOpenChange,
  onSubmit,
  initialAddress
}: AddressCollectionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<AddressData>({
    addressLine1: initialAddress?.addressLine1 || '',
    addressLine2: initialAddress?.addressLine2 || '',
    city: initialAddress?.city || '',
    state: initialAddress?.state || '',
    zipCode: initialAddress?.zipCode || '',
    country: initialAddress?.country || 'US',
    phone: initialAddress?.phone || '',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof AddressData, string>>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AddressData, string>> = {}

    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Street address is required'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }

    if (!formData.state) {
      newErrors.state = 'State is required'
    }

    if (!formData.zipCode.trim()) {
      newErrors.zipCode = 'ZIP code is required'
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
      newErrors.zipCode = 'Invalid ZIP code format'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      await onSubmit(formData)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save address:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateField = <K extends keyof AddressData>(field: K, value: AddressData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <MapPin className="h-5 w-5 text-gray-900" />
            </div>
            <div>
              <DialogTitle>Shipping Address</DialogTitle>
              <DialogDescription>
                Enter your shipping address to receive your reward
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {/* Address Line 1 */}
            <div className="space-y-2">
              <Label htmlFor="addressLine1">
                Street Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="addressLine1"
                placeholder="123 Main Street"
                value={formData.addressLine1}
                onChange={(e) => updateField('addressLine1', e.target.value)}
                className={errors.addressLine1 ? 'border-red-500' : ''}
              />
              {errors.addressLine1 && (
                <p className="text-sm text-red-500">{errors.addressLine1}</p>
              )}
            </div>

            {/* Address Line 2 */}
            <div className="space-y-2">
              <Label htmlFor="addressLine2">Apartment, Suite, etc.</Label>
              <Input
                id="addressLine2"
                placeholder="Apt 4B"
                value={formData.addressLine2}
                onChange={(e) => updateField('addressLine2', e.target.value)}
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                placeholder="New York"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                className={errors.city ? 'border-red-500' : ''}
              />
              {errors.city && (
                <p className="text-sm text-red-500">{errors.city}</p>
              )}
            </div>

            {/* State and ZIP */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">
                  State <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => updateField('state', value)}
                >
                  <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.state && (
                  <p className="text-sm text-red-500">{errors.state}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">
                  ZIP Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="zipCode"
                  placeholder="10001"
                  value={formData.zipCode}
                  onChange={(e) => updateField('zipCode', e.target.value)}
                  className={errors.zipCode ? 'border-red-500' : ''}
                />
                {errors.zipCode && (
                  <p className="text-sm text-red-500">{errors.zipCode}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone}</p>
              )}
              <p className="text-xs text-gray-500">
                For delivery notifications and questions
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gray-900 hover:bg-gray-800"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Address
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
