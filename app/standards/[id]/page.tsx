import Link from 'next/link'
import { notFound } from 'next/navigation'
import { StandardsService } from '@/lib/services/standards/standards.service'
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  ShieldCheck,
  Calendar,
  FileText,
  AlertTriangle,
  Info,
  Check,
  BookOpen,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StandardDetailsPage({ params }: PageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)

  const standard = (await StandardsService.getStandardById(decodedId)) as any

  if (!standard) {
    notFound()
  }

  const currentVersion = standard.versions?.find((v: any) => v.status === 'CURRENT') || standard.versions?.[0]
  const historicalVersions = standard.versions?.filter((v: any) => v.status !== 'CURRENT') || []

  // Group outgoing relationships by type
  const relationshipsByType: Record<string, any[]> = (standard.outgoingRelationships || []).reduce(
    (acc: Record<string, any[]>, rel: any) => {
      const type = rel.relationshipType
      if (!acc[type]) acc[type] = []
      acc[type].push(rel)
      return acc
    },
    {}
  )

  const relationshipLabels: Record<string, string> = {
    NORMATIVE_REFERENCE: 'Normative References',
    TEST_METHOD: 'Test Methods & Verification',
    SAFETY: 'Safety & Protection Standards',
    INSTALLATION: 'Installation & Wiring',
    TERMINOLOGY: 'Terminology & Definitions',
    RELATED_PRODUCT: 'Related Product Standards',
    RELATED_STANDARD: 'Allied Standards',
  }

  return (
    <main className="app-shell" style={{ minHeight: '100vh', padding: '24px 20px 60px' }}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div style={{ maxWidth: 1040, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
        {/* TOP BAR / BACK NAVIGATION */}
        <div style={{ marginBottom: 20 }}>
          <Link
            href="/"
            className="secondary-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8 }}
          >
            <ArrowLeft size={16} /> Back to IS-Guide AI
          </Link>
        </div>

        {/* HERO / STANDARD HEADER CARD */}
        <div className="glass-card" style={{ padding: '28px 32px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="status-badge green">
                <Check size={12} /> {standard.status === 'ACTIVE' ? 'Active (Current)' : standard.status}
              </span>
              <span className="status-badge blue">{standard.category || 'General Standard'}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              BIS Authoritative Registry · Indian Standards Institution
            </div>
          </div>

          <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary-blue)', fontWeight: 700, marginBottom: 4 }}>
            VERIFIED INDIAN STANDARD
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 10px', lineHeight: 1.2 }}>
            {standard.standardNumber}
          </h1>
          <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-main)', margin: '0 0 16px', lineHeight: 1.4 }}>
            {standard.title}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              padding: '16px 20px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid var(--line-subtle)',
            }}
          >
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>CURRENT VERSION</span>
              <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>
                {currentVersion?.versionLabel || 'Current Edition'}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>PUBLICATION DATE</span>
              <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>
                {currentVersion?.publicationDate
                  ? new Date(currentVersion.publicationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Publication date on official record'}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>AMENDMENTS APPLIED</span>
              <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>
                {standard.amendments.length > 0 ? `${standard.amendments.length} Active Amendments` : 'Nil (Base Standard)'}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>PROVENANCE / SOURCE</span>
              <strong style={{ fontSize: 14, color: 'var(--primary-blue)' }}>
                Bureau of Indian Standards (BIS)
              </strong>
            </div>
          </div>
        </div>

        {/* SCOPE & APPLICABILITY */}
        <div className="glass-card" style={{ padding: '24px 30px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileText size={18} style={{ color: 'var(--primary-blue)' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Scope & Technical Description</h2>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-line', margin: 0 }}>
            {standard.scope || standard.title}
          </p>

          {standard.sourceUrl && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line-subtle)' }}>
              <a
                href={standard.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-link"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
              >
                <ExternalLink size={14} /> Verify standard on official BIS Standards Portal
              </a>
            </div>
          )}
        </div>

        {/* VERSION & AMENDMENT INTELLIGENCE (FEATURE 8) */}
        <div className="glass-card" style={{ padding: '24px 30px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Calendar size={18} style={{ color: 'var(--primary-blue)' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Version & Amendment History
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {/* VERSIONS */}
            <div style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.7)', border: '1px solid var(--line-subtle)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 10 }}>Standard Revisions</h3>
              {(standard.versions || []).length > 0 ? (
                (standard.versions || []).map((ver: any, vIdx: number) => (
                  <div
                    key={ver.id || `ver-${vIdx}`}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      background: ver.status === 'CURRENT' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(255, 255, 255, 0.5)',
                      border: '1px solid var(--line-subtle)',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 13, color: 'var(--text-main)' }}>{ver.versionLabel}</strong>
                      {ver.publicationDate && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Published: {new Date(ver.publicationDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                    <span className={`status-badge ${ver.status === 'CURRENT' ? 'green' : 'slate'}`}>
                      {ver.status}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Current version information unavailable — verify with official BIS source.
                </div>
              )}
            </div>

            {/* AMENDMENTS */}
            <div style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.7)', border: '1px solid var(--line-subtle)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 10 }}>Gazetted Amendments</h3>
              {(standard.amendments || []).length > 0 ? (
                (standard.amendments || []).map((amd: any, aIdx: number) => (
                  <div
                    key={amd.id || `amd-${aIdx}`}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.5)',
                      border: '1px solid var(--line-subtle)',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: 13, color: 'var(--primary-blue)' }}>{amd.amendmentNumber}</strong>
                      {amd.publicationDate && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(amd.publicationDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    {amd.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.4 }}>
                        {amd.description}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12 }}>
                  No published amendments on record for this standard edition.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RELATED STANDARDS GRAPH & NORMATIVE RELATIONSHIPS (FEATURE 6) */}
        <div className="glass-card" style={{ padding: '24px 30px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <GitBranch size={18} style={{ color: 'var(--primary-blue)' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Cross-Standard Relationships & Normative Tree
            </h2>
          </div>

          {Object.keys(relationshipsByType).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(relationshipsByType).map(([type, rawList]) => {
                const list = (rawList as any[]) || []
                return (
                  <div key={type} style={{ padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.7)', border: '1px solid var(--line-subtle)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-blue)', textTransform: 'uppercase', marginBottom: 8 }}>
                      {relationshipLabels[type] || type} ({list.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
                      {list.map((r: any, rIdx: number) => (
                        <Link
                          key={r.id || `rel-${rIdx}`}
                          href={`/standards/${encodeURIComponent(r.targetStandard?.standardNumber || '')}`}
                          style={{
                            padding: 10,
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.6)',
                            border: '1px solid var(--line-subtle)',
                            display: 'block',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <strong style={{ fontSize: 13, color: 'var(--primary-blue)', display: 'block' }}>
                            {r.targetStandard?.standardNumber}
                          </strong>
                        <span style={{ fontSize: 12, color: 'var(--text-main)', display: 'block', margin: '2px 0 4px' }}>
                          {r.targetStandard?.title}
                        </span>
                        {r.description && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {r.description}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: 12 }}>
              No explicit cross-standard dependencies currently cataloged in this demonstration registry.
            </div>
          )}
        </div>

        {/* STATUTORY DISCLAIMER (FEATURE 20 & CRITICAL RULES) */}
        <div
          style={{
            padding: '14px 20px',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid var(--line-subtle)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Info size={18} style={{ color: 'var(--primary-blue)', flexShrink: 0 }} />
          <span>
            <strong>Official Notice:</strong> Recommendations and standard references are intended to assist procurement review and should be verified against the latest applicable official standards and regulatory requirements on the official Bureau of Indian Standards portal.
          </span>
        </div>
      </div>
    </main>
  )
}
