'use client'

import React, { Suspense, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import {
  LogIn,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ChevronLeft,
  Sparkles,
} from 'lucide-react'

function EmblemOfIndia({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C10.6 2 9.5 3.1 9.5 4.5C9.5 5.5 10.1 6.4 11 6.8C9.5 7.4 8.5 8.8 8.5 10.5C8.5 12 9.5 13.2 11 13.7V15H7V17H17V15H13V13.7C14.5 13.2 15.5 12 15.5 10.5C15.5 8.8 14.5 7.4 13 6.8C13.9 6.4 14.5 5.5 14.5 4.5C14.5 3.1 13.4 2 12 2Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <circle cx="12" cy="19" r="2.2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="19" r="0.6" fill="currentColor" />
      <path d="M5 21.5H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect') || '/dashboard'

  const { signIn, resetPassword, demoLogin } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [demoLoggingIn, setDemoLoggingIn] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)

  const handleQuickDemoLogin = async () => {
    setDemoLoggingIn(true)
    setErrorMsg(null)
    try {
      await demoLogin()
      router.push(redirectPath)
    } catch {
      setErrorMsg('Demo authentication could not be completed. Please try again.')
      setDemoLoggingIn(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid official or organizational email address.')
      return
    }

    if (!password) {
      setErrorMsg('Please enter your password.')
      return
    }

    setSubmitting(true)
    const res = await signIn(email, password)
    setSubmitting(false)

    if (res.success) {
      router.push(redirectPath)
    } else {
      setErrorMsg(res.error || 'Authentication could not be completed. Please check your credentials.')
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setErrorMsg('Please provide a valid email to receive password reset instructions.')
      return
    }

    setResetSubmitting(true)
    const res = await resetPassword(resetEmail)
    setResetSubmitting(false)

    if (res.success) {
      setResetSuccess('Password reset link has been dispatched to your email address.')
      setShowForgotModal(false)
    } else {
      setErrorMsg(res.error || 'Password reset request failed. Please try again.')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: '#0B132B',
      }}
    >
      {/* Background India Gate Photograph */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <Image
          src="/india-gate.jpg"
          alt="India Gate National Monument, New Delhi"
          fill
          priority
          sizes="100vw"
          style={{
            objectFit: 'cover',
            objectPosition: 'center 40%',
            filter: 'brightness(0.65) contrast(1.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(11, 20, 42, 0.75) 0%, rgba(10, 17, 34, 0.9) 100%)',
          }}
        />
      </div>

      {/* Main Glass Authentication Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 440,
          borderRadius: 16,
          background: 'rgba(15, 23, 42, 0.82)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '36px 32px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Back Link */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#94A3B8',
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
            marginBottom: 20,
            transition: 'color 0.15s ease',
          }}
        >
          <ChevronLeft size={14} /> Back to Landing Page
        </Link>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F8FAFC',
              marginBottom: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}
          >
            <EmblemOfIndia size={26} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            IS-GUIDE AI
          </h1>
          <div style={{ fontSize: 13, color: '#93C5FD', fontWeight: 600 }}>
            Sign In to Procurement Intelligence
          </div>
        </div>

        {/* Success Alert */}
        {resetSuccess && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              color: '#A7F3D0',
              fontSize: 13,
              marginBottom: 18,
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{resetSuccess}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(248, 113, 113, 0.35)',
              color: '#FECACA',
              fontSize: 13,
              marginBottom: 18,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1-Click Fast Demo Login Option for Judges & Evaluators */}
        <div style={{ marginBottom: 22 }}>
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={demoLoggingIn}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              padding: '12px 18px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.32) 100%)',
              color: '#FEF3C7',
              fontSize: 14,
              fontWeight: 700,
              border: '1px solid rgba(245, 158, 11, 0.6)',
              cursor: demoLoggingIn ? 'not-allowed' : 'pointer',
              boxShadow: '0 0 16px rgba(245, 158, 11, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            {demoLoggingIn ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} style={{ color: '#F59E0B' }} />
            )}
            <span>⚡ Instant Demo Login (Procurement Officer)</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 6px' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.14)' }} />
            <span
              style={{
                fontSize: 11,
                color: '#94A3B8',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Or sign in with credentials
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.14)' }} />
          </div>
        </div>

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#CBD5E1',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748B',
                }}
              />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="officer@nic.in or user@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'all 0.15s ease',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#CBD5E1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#60A5FA',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 500,
                }}
              >
                Forgot Password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748B',
                }}
              />
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'all 0.15s ease',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '12px 20px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 700,
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.75 : 1,
              marginTop: 4,
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Signing In...
              </>
            ) : (
              <>
                <LogIn size={16} /> Sign In
              </>
            )}
          </button>
        </form>

        {/* Sign Up Redirect */}
        <div
          style={{
            marginTop: 26,
            paddingTop: 20,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            fontSize: 13,
            color: '#94A3B8',
          }}
        >
          Don&apos;t have an account?{' '}
          <Link
            href="/sign-up"
            style={{
              color: '#60A5FA',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Sign Up
          </Link>
        </div>

        {/* Security Notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 18,
            fontSize: 11,
            color: '#64748B',
          }}
        >
          <ShieldCheck size={13} />
          <span>Secured with Supabase Authentication</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              borderRadius: 14,
              background: '#0F172A',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: 28,
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>
              Reset Your Password
            </h3>
            <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 16px', lineHeight: 1.5 }}>
              Enter your registered email address and we will dispatch a secure Supabase password recovery link.
            </p>

            <form onSubmit={handleForgotPassword}>
              <div style={{ marginBottom: 16 }}>
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#CBD5E1',
                    fontSize: 13,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    background: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    cursor: resetSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {resetSubmitting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070D18', color: '#fff' }}>
          <Loader2 className="animate-spin" size={32} />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  )
}

