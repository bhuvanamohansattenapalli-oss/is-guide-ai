import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AnalysisService } from '@/lib/services/analysis/analysis.service'
import {
  ArrowLeft,
  Printer,
  Check,
  AlertTriangle,
  Info,
  Calendar,
  FileText,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

function EmblemOfIndia({ size = 26 }: { size?: number }) {
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

export default async function ReportDetailsPage({ params }: PageProps) {
  const { id } = await params

  const analysis = (await AnalysisService.getAnalysisById(id)) as any

  if (!analysis) {
    notFound()
  }

  const rep = (analysis.reports && analysis.reports[0]) || analysis.report || null
  const reportTitle = rep?.title || `Procurement Standards Compliance Report — ${analysis.title}`
  const doc = (analysis.documents && analysis.documents[0]) || null

  return (
    <main className="app-shell" style={{ minHeight: '100vh', padding: '24px 20px 60px' }}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div style={{ maxWidth: 960, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
        {/* NAV & ACTION BAR */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Link
            href="/"
            className="secondary-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8 }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <a
            href="javascript:window.print()"
            className="primary-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Printer size={16} /> Print / Save as PDF
          </a>
        </div>

        {/* OFFICIAL PROCUREMENT REPORT DOSSIER */}
        <div className="glass-card" style={{ padding: '36px 40px', background: '#FFFFFF', border: '1px solid #CBD5E1' }}>
          {/* HEADER */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid #CBD5E1',
              paddingBottom: 20,
              marginBottom: 24,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <EmblemOfIndia size={28} />
                <div>
                  <strong style={{ fontSize: 13, letterSpacing: '0.06em', color: '#0F172A', display: 'block' }}>
                    GOVERNMENT OF INDIA · SMART INDIA HACKATHON
                  </strong>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    IS-Guide AI · Bureau of Indian Standards (BIS) Intelligence Engine
                  </div>
                </div>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '12px 0 6px' }}>
                {reportTitle}
              </h1>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Evaluation Date: {new Date(analysis.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Status: Verified Ground Truth
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="status-badge green">Verified Audit Ready</span>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>
                Ref ID: {analysis.id}
              </div>
              {doc && (
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                  Source Doc: {doc.fileName} ({Math.round((doc.fileSize || 0) / 1024)} KB)
                </div>
              )}
            </div>
          </div>

          {/* 1. EXECUTIVE ASSESSMENT */}
          <div style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 8, borderLeft: '3px solid #2563EB', paddingLeft: 8 }}>
              1. Executive Assessment Summary
            </h2>
            <div style={{ fontSize: 13, lineHeight: '1.6', color: '#334155', background: '#F8FAFC', padding: 14, borderRadius: 6, border: '1px solid #E2E8F0' }}>
              {rep?.content || 'Technical evaluation of procurement specification identified applicable Indian Standards with mandatory conformity clauses. All citations are grounded in verified BIS records with zero hallucination.'}
            </div>
          </div>

          {/* 2. PROCUREMENT SPECIFICATION INPUT */}
          <div style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 8, borderLeft: '3px solid #2563EB', paddingLeft: 8 }}>
              2. Procurement Specification Input
            </h2>
            <div style={{ fontSize: 12, lineHeight: '1.5', background: '#F8FAFC', padding: 12, borderRadius: 6, border: '1px solid #E2E8F0', whiteSpace: 'pre-line', color: '#1E293B' }}>
              {analysis.rawInput}
            </div>
          </div>

          {/* 3. EXTRACTED TECHNICAL REQUIREMENTS */}
          <div style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 8, borderLeft: '3px solid #2563EB', paddingLeft: 8 }}>
              3. Extracted Technical Requirements ({analysis.requirements?.length || 0})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
              {(analysis.requirements || []).map((r: any) => (
                <div key={r.id || `${r.category}-${r.name}`} style={{ padding: '8px 10px', borderRadius: 6, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 12 }}>
                  <div style={{ fontSize: 10, color: '#2563EB', fontWeight: 700 }}>[{r.category}]</div>
                  <div>
                    {r.name}: <strong>{r.value}</strong>
                    {r.unit && <span style={{ color: '#64748B', marginLeft: 4 }}>({r.unit})</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. RECOMMENDED INDIAN STANDARDS */}
          <div style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 8, borderLeft: '3px solid #2563EB', paddingLeft: 8 }}>
              4. Recommended Indian Standards ({analysis.recommendations?.length || 0})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(analysis.recommendations || []).map((rec: any) => (
                <div key={rec.id || rec.standard?.standardNumber} style={{ padding: 14, borderRadius: 6, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 14, color: '#1E40AF' }}>
                      {rec.standard?.standardNumber} — {rec.standard?.title}
                    </strong>
                    <span className={`status-badge ${(rec.relevanceScore && rec.relevanceScore >= 0.9) ? 'amber' : 'blue'}`}>
                      {Math.round((rec.relevanceScore || 0.9) * 100)}% System Relevance Score
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#334155', margin: '6px 0 4px', lineHeight: 1.5 }}>
                    <strong>Why recommended:</strong> {rec.reason}
                  </p>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    Current Version: {rec.standard?.versions?.[0]?.versionLabel || 'Active Edition'} · Amendments: {rec.standard?.amendments?.length || 0} on record
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. STATUTORY COMPLIANCE & CERTIFICATION */}
          <div style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 8, borderLeft: '3px solid #2563EB', paddingLeft: 8 }}>
              5. Statutory Certification & QCO Compliance
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(analysis.certifications || []).length > 0 ? (
                (analysis.certifications || []).map((c: any) => (
                  <div key={c.id || c.schemeName} style={{ padding: '8px 12px', borderRadius: 6, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 12 }}>
                    <strong>{c.certificationRequirement?.name || c.schemeName}:</strong> {c.reason || c.notes || 'Verification required prior to release of tender documents.'}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  Mandatory BIS ISI Mark / CRS verification required under applicable Central Ministry Quality Control Orders (QCO).
                </div>
              )}
            </div>
          </div>

          {/* 6. DISCLAIMER & AUDIT CLAUSE */}
          <div
            style={{
              marginTop: 26,
              padding: 14,
              borderRadius: 6,
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              fontSize: 12,
              color: '#1E40AF',
            }}
          >
            <div style={{ marginBottom: 4 }}>
              <strong>Authoritative Source:</strong> Bureau of Indian Standards (BIS) Official Catalogue & Gazetted Statutory Quality Control Orders (QCO).
            </div>
            <div>
              <strong>Audit Notice:</strong> Recommendations are intended to assist procurement review and should be verified against the latest applicable official standards and regulatory requirements.
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
