'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import {
  ShieldCheck,
  Sparkles,
  FileCheck2,
  BookOpen,
  ArrowRight,
  LogIn,
  UserPlus,
  Scale,
  CheckCircle2,
  Building2,
  Globe2,
} from 'lucide-react'

function EmblemOfIndia({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C10.6 2 9.5 3.1 9.5 4.5C9.5 5.5 10.1 6.4 11 6.8C9.5 7.4 8.5 8.8 8.5 10.5C8.5 12 9.5 13.2 11 13.7V15H7V17H17V15H13V13.7C14.5 13.2 15.5 12 15.5 10.5C15.5 8.8 14.5 7.4 13 6.8C13.9 6.4 14.5 5.5 14.5 4.5C14.5 3.1 13.4 2 12 2Z"
        fill="currentColor"
        fillOpacity="0.95"
      />
      <circle cx="12" cy="19" r="2.2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="19" r="0.6" fill="currentColor" />
      <path d="M5 21.5H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden', background: '#0B132B' }}>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO BACKGROUND: India Gate Photograph + Refined Glass Overlay
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
            filter: 'brightness(0.72) contrast(1.08)',
          }}
        />
        {/* Harmonious Dark / Glass Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(11, 20, 42, 0.72) 0%, rgba(15, 23, 42, 0.65) 45%, rgba(10, 17, 34, 0.92) 100%)',
          }}
        />
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            TOP HEADER / BRAND BAR
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <header
          style={{
            width: '100%',
            padding: '16px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            background: 'rgba(15, 23, 42, 0.65)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F8FAFC',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}
            >
              <EmblemOfIndia size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: '#FFFFFF',
                    fontFamily: 'inherit',
                  }}
                >
                  IS-GUIDE <span style={{ color: '#60A5FA' }}>AI</span>
                </span>
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(96, 165, 250, 0.4)',
                    color: '#93C5FD',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Gov-Tech
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 500 }}>
                Bureau of Indian Standards · Intelligence Platform
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user ? (
              <Link
                href="/dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 20px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  transition: 'all 0.15s ease',
                }}
              >
                Go to Dashboard <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 18px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#F1F5F9',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <LogIn size={15} /> Sign In
                </Link>
                <Link
                  href="/sign-up"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 20px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <UserPlus size={15} /> Sign Up
                </Link>
              </>
            )}
          </div>
        </header>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            MAIN HERO SECTION (India Gate focal point + Refined Glass Card)
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '48px 20px 60px',
            maxWidth: 1180,
            margin: '0 auto',
            width: '100%',
          }}
        >
          {/* BADGE */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: '#E0E7FF',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 24,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
            }}
          >
            <Sparkles size={14} style={{ color: '#FBBF24' }} />
            <span>National Standards Compliance & Intelligence Engine</span>
          </div>

          {/* MAIN PROMINENT TITLE */}
          <h1
            style={{
              fontSize: 'clamp(2.4rem, 5.5vw, 4rem)',
              fontWeight: 900,
              lineHeight: 1.12,
              textAlign: 'center',
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
              margin: '0 0 12px',
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.6)',
            }}
          >
            IS-GUIDE AI
          </h1>

          <div
            style={{
              fontSize: 'clamp(1.15rem, 2.5vw, 1.65rem)',
              fontWeight: 700,
              textAlign: 'center',
              color: '#93C5FD',
              letterSpacing: '-0.01em',
              marginBottom: 18,
              textShadow: '0 2px 14px rgba(0, 0, 0, 0.5)',
            }}
          >
            Indian Standards Intelligence Platform
          </div>

          {/* SUBTITLE */}
          <p
            style={{
              maxWidth: 720,
              fontSize: 'clamp(1rem, 1.8vw, 1.2rem)',
              lineHeight: 1.6,
              textAlign: 'center',
              color: '#E2E8F0',
              margin: '0 0 16px',
              textShadow: '0 2px 12px rgba(0, 0, 0, 0.6)',
              fontWeight: 400,
            }}
          >
            AI-powered assistance for procurement specifications, Indian Standards, compliance, and tender preparation.
          </p>

          <p
            style={{
              fontSize: 14,
              color: '#94A3B8',
              textAlign: 'center',
              fontStyle: 'italic',
              margin: '0 0 34px',
              textShadow: '0 1px 8px rgba(0,0,0,0.5)',
            }}
          >
            &ldquo;Intelligent standards discovery for better procurement decisions.&rdquo;
          </p>

          {/* PRIMARY ACTIONS */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: 56,
            }}
          >
            <Link
              href="/sign-in"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 34px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              <LogIn size={18} /> Sign In
            </Link>

            <Link
              href="/sign-up"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 38px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                boxShadow: '0 8px 30px rgba(37, 99, 235, 0.45)',
                transition: 'all 0.2s ease',
              }}
            >
              <UserPlus size={18} /> Sign Up
            </Link>

            {user && (
              <Link
                href="/dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '14px 30px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 8px 24px rgba(5, 150, 105, 0.4)',
                }}
              >
                Access Active Session <ArrowRight size={18} />
              </Link>
            )}
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              REFINED GLASS FEATURE CARDS (Gov-tech + Glassmorphism aesthetic)
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 18,
              width: '100%',
              maxWidth: 1080,
            }}
          >
            {/* Card 1 */}
            <div
              style={{
                padding: '24px 22px',
                borderRadius: 14,
                background: 'rgba(15, 23, 42, 0.72)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(96, 165, 250, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60A5FA',
                  marginBottom: 14,
                }}
              >
                <BookOpen size={20} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>
                BIS Standards Registry
              </h3>
              <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.5, margin: 0 }}>
                Authoritative catalog of Indian Standards spanning civil, electrical, safety, piping, and mechanical engineering with gazetted amendment tracking.
              </p>
            </div>

            {/* Card 2 */}
            <div
              style={{
                padding: '24px 22px',
                borderRadius: 14,
                background: 'rgba(15, 23, 42, 0.72)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(52, 211, 153, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34D399',
                  marginBottom: 14,
                }}
              >
                <FileCheck2 size={20} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>
                Tender Spec Analyzer
              </h3>
              <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.5, margin: 0 }}>
                Upload PDF, DOCX, or paste text in English, Hindi, or Telugu to automatically parse technical parameters and detect missing specification clauses.
              </p>
            </div>

            {/* Card 3 */}
            <div
              style={{
                padding: '24px 22px',
                borderRadius: 14,
                background: 'rgba(15, 23, 42, 0.72)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid rgba(251, 191, 36, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FBBF24',
                  marginBottom: 14,
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>
                Statutory QCO & ISI Mark
              </h3>
              <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.5, margin: 0 }}>
                Instant identification of mandatory Central Government Quality Control Orders (QCO) and Compulsory Registration Schemes (CRS) for public tenders.
              </p>
            </div>

            {/* Card 4 */}
            <div
              style={{
                padding: '24px 22px',
                borderRadius: 14,
                background: 'rgba(15, 23, 42, 0.72)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(167, 139, 250, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#A78BFA',
                  marginBottom: 14,
                }}
              >
                <Scale size={20} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>
                Explainable Evidence Traces
              </h3>
              <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.5, margin: 0 }}>
                Every recommendation links back to exact tender requirements and verified standards clauses, eliminating AI hallucinations and audit ambiguities.
              </p>
            </div>
          </div>
        </main>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            SUBTLE STATUTORY FOOTER
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <footer
          style={{
            padding: '22px 20px',
            textAlign: 'center',
            background: 'rgba(10, 16, 32, 0.88)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                color: '#94A3B8',
                margin: '0 0 8px',
              }}
            >
              Recommendations are intended to assist procurement review and should be verified against the latest applicable official standards and regulatory requirements.
            </p>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              IS-Guide AI · Developed for Government of India Smart India Hackathon (SIH) · Bureau of Indian Standards (BIS) Intelligence Platform
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
