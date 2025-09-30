import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  async function PasswordForm() {
    'use server'
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">My Account</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600">Email</label>
              <Input defaultValue={user.email || ''} readOnly />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={async (formData: FormData) => {
              'use server'
              const newPassword = String(formData.get('newPassword') || '')
              await fetch('/api/account/password/change', { method: 'POST', body: JSON.stringify({ newPassword }), headers: { 'Content-Type': 'application/json' } })
            }} className="space-y-3">
              <Input name="newPassword" type="password" placeholder="New password" required minLength={8} />
              <Button type="submit" className="bg-coral-500 hover:bg-coral-600">Update Password</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Email</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={async (formData: FormData) => {
              'use server'
              const newEmail = String(formData.get('newEmail') || '')
              await fetch('/api/account/email/start-change', { method: 'POST', body: JSON.stringify({ newEmail }), headers: { 'Content-Type': 'application/json' } })
            }} className="space-y-3">
              <Input name="newEmail" type="email" placeholder="New email" required />
              <Button type="submit" className="bg-coral-500 hover:bg-coral-600">Send verification</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserBySupabaseId } from '@/lib/db/queries'
import { AccountSettingsForm } from '@/components/account/account-settings-form'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login?redirectTo=/account')
  }

  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Coral accent bar */}
      <div className="h-1 bg-gradient-to-r from-coral-500 to-terracotta-600" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your account information and security settings
          </p>
        </div>

        <AccountSettingsForm
          user={user}
          dbUser={dbUser}
        />
      </div>
    </div>
  )
}