import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip auth for public routes, API, and static assets
  const publicExact = [
    '/',
    '/about',
    '/help',
    '/contact',
    '/faq',
    '/privacy',
    '/terms',
    '/how-it-works',
    '/challenges',
    '/auth/login',
    '/auth/signup',
    '/auth/logout'
  ].includes(pathname)
  const publicPrefix = (
    pathname.startsWith('/invite') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/auth/')
  )
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/api/') || pathname.includes('.')
  
  if (publicExact || publicPrefix || isStatic) {
    return NextResponse.next()
  }
  
  let response = NextResponse.next()
  
  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => 
          response.cookies.set(name, value, options))
      }
    }
  )

  try {
    // Use getUser for secure authentication check
    const { data: { user }, error } = await supabase.auth.getUser()
    
    // Require authentication
    if (error || !user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Handle workspace slug extraction and pass to server components
    const slugMatch = pathname.match(/^\/w\/([^\/]+)/)
    if (slugMatch) {
      const slug = slugMatch[1]

      // Set workspace context headers (let dashboard pages handle authorization)
      response.headers.set('x-workspace-slug', slug)
      response.headers.set('x-user-id', user.id)
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api|_next|[\\w-]+\\.\\w+).*)'
  ]
};
