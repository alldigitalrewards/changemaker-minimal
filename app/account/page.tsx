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