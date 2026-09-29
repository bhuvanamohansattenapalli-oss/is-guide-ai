import { NextResponse } from 'next/server'

/**
 * Health check endpoint for system uptime & monitoring
 * GET /api/health
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'is-guide-ai-api',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  )
}
