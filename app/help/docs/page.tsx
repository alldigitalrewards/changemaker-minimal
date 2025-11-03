import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink } from 'lucide-react'

export const metadata = {
  title: 'Getting Started - Changemaker Documentation',
  description: 'Learn how to authenticate and make your first API calls with the Changemaker platform',
}

export default function GettingStartedPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/docs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Documentation
          </Link>
        </Button>
      </div>

      <article className="prose prose-slate max-w-none dark:prose-invert">
        <h1>Getting Started with Changemaker</h1>
        <p className="lead">
          This guide will help you understand the basics of authenticating with the Changemaker platform
          and making your first API calls.
        </p>

        <h2>Authentication</h2>
        <p>
          All API requests require authentication using Supabase session cookies. When you log in through
          the web interface, a session cookie is automatically set.
        </p>

        <h3>Making Authenticated Requests</h3>
        <p>
          Include credentials in your fetch requests to send the session cookie:
        </p>

        <pre>
          <code>{`fetch('https://changemaker.im/api/user/workspaces', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`}</code>
        </pre>

        <h3>Session Management</h3>
        <p>
          Sessions are managed by Supabase and are valid for a configurable duration. If you receive
          a 401 Unauthorized response, your session has expired and you need to log in again.
        </p>

        <h2>Workspace Context</h2>
        <p>
          Most API operations require a workspace context. Public endpoints use the format:
        </p>

        <pre>
          <code>{`/api/user/workspaces           # List user's workspaces
/api/workspaces/{slug}         # Get workspace details
/api/workspaces/{slug}/...     # Workspace-specific operations`}</code>
        </pre>

        <h3>Switching Workspaces</h3>
        <p>
          Users can belong to multiple workspaces. To switch context:
        </p>

        <pre>
          <code>{`POST /api/auth/switch-workspace
Content-Type: application/json

{
  "workspaceId": "uuid-of-workspace"
}`}</code>
        </pre>

        <h2>Making Your First API Call</h2>
        <p>
          Let's retrieve your list of workspaces:
        </p>

        <pre>
          <code>{`// Fetch user's workspaces
const response = await fetch('/api/user/workspaces', {
  credentials: 'include'
});

if (!response.ok) {
  throw new Error('Failed to fetch workspaces');
}

const { workspaces } = await response.json();
console.log('My workspaces:', workspaces);`}</code>
        </pre>

        <h2>Error Handling</h2>
        <p>
          The API uses standard HTTP status codes and returns errors in a consistent format:
        </p>

        <pre>
          <code>{`// Error response format
{
  "error": "Resource not found",
  "details": "Challenge with ID abc123 does not exist"
}`}</code>
        </pre>

        <h3>Common Status Codes</h3>
        <ul>
          <li><code>200 OK</code> - Request succeeded</li>
          <li><code>201 Created</code> - Resource created successfully</li>
          <li><code>400 Bad Request</code> - Invalid request data or parameters</li>
          <li><code>401 Unauthorized</code> - Authentication required or session expired</li>
          <li><code>403 Forbidden</code> - Insufficient permissions</li>
          <li><code>404 Not Found</code> - Resource does not exist</li>
          <li><code>500 Internal Server Error</code> - Server error occurred</li>
        </ul>

        <h3>Error Handling Example</h3>
        <pre>
          <code>{`try {
  const response = await fetch('/api/workspaces/my-workspace/challenges', {
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();

    switch (response.status) {
      case 401:
        // Redirect to login
        window.location.href = '/auth/signin';
        break;
      case 403:
        console.error('Access denied:', error.error);
        break;
      case 404:
        console.error('Resource not found:', error.error);
        break;
      default:
        console.error('API error:', error.error);
    }

    return;
  }

  const data = await response.json();
  console.log('Challenges:', data.challenges);
} catch (error) {
  console.error('Network error:', error);
}`}</code>
        </pre>

        <h2>Rate Limiting</h2>
        <p>
          API requests are rate limited to ensure fair usage. Rate limit information is included in response headers:
        </p>

        <ul>
          <li><code>X-RateLimit-Limit</code> - Maximum requests per window</li>
          <li><code>X-RateLimit-Remaining</code> - Requests remaining in current window</li>
          <li><code>X-RateLimit-Reset</code> - Time when the rate limit resets (Unix timestamp)</li>
        </ul>

        <p>
          If you exceed the rate limit, you'll receive a <code>429 Too Many Requests</code> response.
          Wait for the reset time before making additional requests.
        </p>

        <h2>Next Steps</h2>
        <div className="not-prose mt-6 flex flex-col gap-4 sm:flex-row">
          <Button asChild>
            <Link href="/docs/public-api">
              View API Reference
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contact">Get Support</Link>
          </Button>
        </div>

        <div className="mt-12 rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950/20">
          <h3 className="mt-0">Looking for Internal API Documentation?</h3>
          <p className="mb-4">
            Workspace administrators have access to additional endpoints for managing challenges,
            participants, and administrative operations.
          </p>
          <p className="mb-0">
            Navigate to your workspace's admin panel to access the internal API reference.
          </p>
        </div>
      </article>
    </main>
  )
}
