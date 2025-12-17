import { NextResponse } from 'next/server';

/**
 * GET /api/health - Health check endpoint (no authentication required)
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
