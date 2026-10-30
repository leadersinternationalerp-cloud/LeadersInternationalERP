import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getAllowedRolesForPath } from '@/lib/auth/route-acl'
import { normalizeRoles, hasAnyRole } from '@/lib/auth/roles'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname

  // Public asset or unauthenticated whitelist check
  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/kitchen/display') ||
    pathname === '/offline.html' ||
    pathname === '/sw.js' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/manifest.json'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Handle API routes before checking or redirecting for pages
  if (pathname.startsWith('/api/')) {
    const isExemptApi =
      pathname === '/api/attendance/biometric' ||
      pathname === '/api/health' ||
      pathname === '/api/admissions/apply' ||
      pathname === '/api/admin/go-live-setup'

    if (isExemptApi) {
      return supabaseResponse
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
        { status: 401, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isPublic) {
      return supabaseResponse
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // API unauthenticated check: 401 JSON, never 307 redirect
  if (pathname.startsWith('/api/')) {
    const isExemptApi =
      pathname === '/api/attendance/biometric' ||
      pathname === '/api/health' ||
      pathname === '/api/admissions/apply' ||
      pathname === '/api/admin/go-live-setup'
    if (!isExemptApi && !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
        { status: 401, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }
    return supabaseResponse
  }

  // Page unauthenticated check
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is authenticated and navigating to a role-scoped dashboard path, enforce ACL
  if (user && pathname.startsWith('/dashboard')) {
    const allowedRoles = getAllowedRolesForPath(pathname)
    if (allowedRoles) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, roles')
        .eq('id', user.id)
        .single()

      const roles = normalizeRoles(profile)
      if (!hasAnyRole(roles, allowedRoles)) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        url.searchParams.set('denied', '1')
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
