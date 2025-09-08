import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()

    return NextResponse.redirect(new URL('/auth/login', request.url))
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}