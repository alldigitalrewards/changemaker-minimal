import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Participant signout error:', error)
  }
  return NextResponse.redirect(new URL('/', request.url))
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Participant signout error:', error)
  }
  return NextResponse.redirect(new URL('/', request.url))
}


