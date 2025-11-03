'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Edit2 } from 'lucide-react'
import { AddressCollectionDialog, type AddressData } from './address-collection-dialog'
import { useToast } from '@/hooks/use-toast'

interface ProfileAddressProps {
  initialAddress?: {
    addressLine1?: string | null
    addressLine2?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    country?: string | null
    phone?: string | null
  }
}

export function ProfileAddress({ initialAddress }: ProfileAddressProps) {
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentAddress, setCurrentAddress] = useState(initialAddress)

  const hasAddress = currentAddress?.addressLine1 && currentAddress?.city && currentAddress?.state && currentAddress?.zipCode

  const handleSubmit = async (address: AddressData) => {
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(address)
      })

      if (!response.ok) {
        throw new Error('Failed to save address')
      }

      setCurrentAddress(address)
      toast({
        title: 'Address saved',
        description: 'Your shipping address has been updated successfully.'
      })
    } catch (error) {
      console.error('Failed to save address:', error)
      toast({
        title: 'Error',
        description: 'Failed to save address. Please try again.',
        variant: 'destructive'
      })
      throw error
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Shipping Address
          </CardTitle>
          <CardDescription>
            {hasAddress
              ? 'Manage your shipping address for reward redemptions'
              : 'Add your shipping address to redeem physical rewards'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasAddress ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">{currentAddress.addressLine1}</p>
                  {currentAddress.addressLine2 && (
                    <p className="text-gray-700">{currentAddress.addressLine2}</p>
                  )}
                  <p className="text-gray-700">
                    {currentAddress.city}, {currentAddress.state} {currentAddress.zipCode}
                  </p>
                  {currentAddress.country && currentAddress.country !== 'US' && (
                    <p className="text-gray-700">{currentAddress.country}</p>
                  )}
                  {currentAddress.phone && (
                    <p className="text-sm text-gray-600 mt-2">Phone: {currentAddress.phone}</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(true)}
                className="w-full sm:w-auto"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Address
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-coral-200 bg-coral-50 p-4 text-center">
                <MapPin className="h-8 w-8 mx-auto text-coral-600 mb-2" />
                <p className="text-sm text-gray-700">
                  No shipping address on file. Add one to redeem physical rewards.
                </p>
              </div>
              <Button
                onClick={() => setDialogOpen(true)}
                className="w-full sm:w-auto bg-coral-500 hover:bg-coral-600"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Add Shipping Address
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddressCollectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        initialAddress={hasAddress ? {
          addressLine1: currentAddress.addressLine1 || '',
          addressLine2: currentAddress.addressLine2 || '',
          city: currentAddress.city || '',
          state: currentAddress.state || '',
          zipCode: currentAddress.zipCode || '',
          country: currentAddress.country || 'US',
          phone: currentAddress.phone || ''
        } : undefined}
      />
    </>
  )
}
