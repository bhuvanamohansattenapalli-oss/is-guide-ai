'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import {
  UserPlus,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ChevronLeft,
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

export default function SignUpPage() {
  const router = useRouter()
  const { signUp } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [confirmNotice, setConfirmNotice] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg('Please provide your full legal or professional name.')
      return
    }

    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMsg('Please enter a valid email address.')
      return
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.')
      return
    }

    setSubmitting(true)
    const res = await signUp(fullName, email, password)
    setSubmitting(false)

    if (res.success) {
      if (res.message) {
        // Email confirmation required by Supabase project settings
        setConfirmNotice(res.message)
      } else {
        router.push('/dashboard')
      }
    } else {
      setErrorMsg(res.error || 'Registration could not be completed. Please try again.')
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

      {/* Main Glass Sign Up Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 460,
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
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
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
            Create Your Procurement Officer Account
          </div>
        </div>

        {/* Confirmation Notice */}
        {confirmNotice ? (
          <div
            style={{
              padding: '20px',
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              color: '#F1F5F9',
              textAlign: 'center',
            }}
          >
            <CheckCircle2 size={36} style={{ color: '#34D399', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#FFFFFF' }}>
              Registration Received
            </h3>
            <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.5, margin: '0 0 16px' }}>
              {confirmNotice}
            </p>
            <Link
              href="/sign-in"
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                borderRadius: 8,
                background: '#2563EB',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
          <>
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

            {/* Registration Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label
                  htmlFor="fullName"
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
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User
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
                    id="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="e.g. S. Ramanathan or Priya Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 12px 11px 38px',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.07)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#FFFFFF',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

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
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
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
                  Password
                </label>
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
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
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
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
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
                  Confirm Password
                </label>
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
                    id="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 12px 11px 38px',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.07)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#FFFFFF',
                      fontSize: 14,
                      outline: 'none',
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
                  marginTop: 6,
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Create Account
                  </>
                )}
              </button>
            </form>

            {/* Sign In Redirect */}
            <div
              style={{
                marginTop: 24,
                paddingTop: 18,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center',
                fontSize: 13,
                color: '#94A3B8',
              }}
            >
              Already have an account?{' '}
              <Link
                href="/sign-in"
                style={{
                  color: '#60A5FA',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Sign In
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
              <span>Identity Verified via Supabase Authentication</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
