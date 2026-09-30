import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VERIFIED_STANDARDS_CATALOG } from '@/lib/data/verified-standards'

/**
 * Health check endpoint for system uptime & database connectivity monitoring
 * GET /api/health
 */
export async function GET() {
  try {
    const standardsCount = await Promise.race([
      prisma.standard.count(),
      new Promise<number>((_, reject) => setTimeout(() => reject(new Error('Prisma timeout')), 1500)),
    ])
    return NextResponse.json(
      {
        status: 'ok',
        service: 'is-guide-ai-api',
        database: 'CONNECTED',
        standardsCount,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'ok',
        mode: 'degraded_fallback',
        service: 'is-guide-ai-api',
        database: 'DISCONNECTED',
        catalogCount: VERIFIED_STANDARDS_CATALOG.length,
        note: 'Operating on verified BIS in-memory authoritative dataset',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  }
}
