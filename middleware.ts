import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip auth for public routes, API, and static assets
  const isPublic = [
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
    '/auth/signup'
  ].includes(pathname)
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/api/') || pathname.includes('.')
  
  if (isPublic || isStatic) {
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

      // Check membership using Edge-compatible Supabase queries
      const { data: membership } = await supabase
        .from('WorkspaceMembership')
        .select('role, workspace:Workspace!inner(slug)')
        .eq('userId', user.id)
        .eq('workspace.slug', slug)
        .single()
      
      let role = membership?.role

      // Fallback to legacy User.workspaceId check if no membership
      if (!role) {
        const { data: userData } = await supabase
          .from('User')
          .select('role, workspace:Workspace!inner(slug)')
          .eq('supabaseUserId', user.id)
          .eq('workspace.slug', slug)
          .single()
        
        role = userData?.role
      }

      if (!role) {
        return NextResponse.redirect(new URL('/workspaces', request.url))
      }

      // Set workspace context headers
      response.headers.set('x-workspace-slug', slug)
      response.headers.set('x-user-id', user.id)
      response.headers.set('x-workspace-role', role)
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
