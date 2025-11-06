import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Mail } from 'lucide-react'

export default async function TestInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-coral-50 to-orange-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-coral-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-coral-600" />
          </div>
          <CardTitle className="text-2xl">Test Email Preview</CardTitle>
          <CardDescription>
            This is a test invitation link from an email template preview
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-900">Email template is working correctly!</p>
              <p className="text-sm text-green-700 mt-1">
                Links in your email are rendering properly. In a real invitation, this would take users to the actual invite acceptance page.
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p>
              <strong>What happens with real invitations:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Recipient clicks the invitation link</li>
              <li>They're taken to a secure invite page</li>
              <li>They can accept and join the workspace</li>
              <li>Account is created or linked automatically</li>
            </ul>
          </div>

          <p className="text-xs text-gray-500 text-center pt-4 border-t">
            This test page helps validate email templates before sending real invitations.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
