'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CoralButton } from '@/components/ui/coral-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, User, Upload, Bell, CheckCircle2 } from 'lucide-react'

export default function CompleteProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Form state
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [challengeUpdates, setChallengeUpdates] = useState(true)
  const [rewardAlerts, setRewardAlerts] = useState(true)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setUploadingImage(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/profile-image', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const data = await response.json()
      setProfileImage(data.url)
    } catch (err: any) {
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileImage,
          phone,
          bio,
          preferences: {
            emailNotifications,
            challengeUpdates,
            rewardAlerts
          }
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-semibold">
                ✓
              </div>
              <span className="text-sm text-gray-600 hidden sm:inline">Account Created</span>
            </div>
            <div className="w-16 h-0.5 bg-green-500"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-coral-500 text-white flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <span className="text-sm font-semibold text-coral-600 hidden sm:inline">Complete Profile</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <span className="text-sm text-gray-500 hidden sm:inline">Get Started</span>
            </div>
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">
            Step 2 of 3 - Tell us more about yourself (optional)
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-coral-100 rounded-full flex items-center justify-center mb-3">
              <User className="h-6 w-6 text-coral-600" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl">Complete Your Profile</CardTitle>
            <CardDescription className="text-base mt-2">
              Add optional information to personalize your experience
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Photo */}
              <div className="space-y-3">
                <Label htmlFor="profileImage">Profile Photo</Label>
                <div className="flex items-center gap-4">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      id="profileImage"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    <label htmlFor="profileImage">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingImage}
                        onClick={() => document.getElementById('profileImage')?.click()}
                        className="cursor-pointer"
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Photo
                          </>
                        )}
                      </Button>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG or GIF. Max size 5MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
                <p className="text-xs text-gray-500">
                  We'll only use this for important account notifications
                </p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a bit about yourself..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 text-right">
                  {bio.length}/500 characters
                </p>
              </div>

              {/* Notification Preferences */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="h-5 w-5 text-gray-600" />
                  <Label className="text-base font-semibold">Notification Preferences</Label>
                </div>

                <div className="space-y-3 pl-7">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="emailNotifications"
                      checked={emailNotifications}
                      onCheckedChange={(checked) => setEmailNotifications(checked as boolean)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor="emailNotifications" className="text-sm font-medium cursor-pointer">
                        Email Notifications
                      </label>
                      <p className="text-xs text-gray-500">
                        Receive updates and announcements via email
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="challengeUpdates"
                      checked={challengeUpdates}
                      onCheckedChange={(checked) => setChallengeUpdates(checked as boolean)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor="challengeUpdates" className="text-sm font-medium cursor-pointer">
                        Challenge Updates
                      </label>
                      <p className="text-xs text-gray-500">
                        Get notified about new challenges and deadlines
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="rewardAlerts"
                      checked={rewardAlerts}
                      onCheckedChange={(checked) => setRewardAlerts(checked as boolean)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor="rewardAlerts" className="text-sm font-medium cursor-pointer">
                        Reward Alerts
                      </label>
                      <p className="text-xs text-gray-500">
                        Be notified when you earn new rewards
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  disabled={loading}
                  className="flex-1"
                >
                  Skip for Now
                </Button>
                <CoralButton
                  type="submit"
                  disabled={loading || uploadingImage}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save and Continue
                    </>
                  )}
                </CoralButton>
              </div>

              <p className="text-xs text-center text-gray-500">
                You can update these settings anytime in your profile
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
