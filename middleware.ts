import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected route prefixes
const PROTECTED_ROUTES = [
  '/dashboard',
  '/analyzer',
  '/history',
  '/standards',
  '/reports',
  '/analysis',
]

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // Check auth cookie
  const authCookie = request.cookies.get('is_guide_auth')
  const hasSbCookie = request.cookies.getAll().some(
    (c) =>
      (c.name.startsWith('sb-') || c.name === 'supabase-auth-token') &&
      Boolean(c.value && c.value !== '""')
  )

  const isAuthenticated = Boolean(authCookie?.value || hasSbCookie)

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  // 1. If trying to access protected route without authentication
  if (isProtectedRoute && !isAuthenticated) {
    const redirectUrl = new URL('/sign-in', request.url)
    redirectUrl.searchParams.set('redirect', pathname + search)
    return NextResponse.redirect(redirectUrl)
  }

  // 2. If already authenticated and accessing /sign-in or /sign-up, forward to /dashboard
  if (isAuthenticated && (pathname === '/sign-in' || pathname === '/sign-up')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/analyzer/:path*',
    '/history/:path*',
    '/standards/:path*',
    '/reports/:path*',
    '/analysis/:path*',
    '/sign-in',
    '/sign-up',
  ],
}
