import { NextResponse } from 'next/server'

export async function GET() {
  // Check environment variables (without exposing secrets)
  const hasClientId = !!process.env.PDF_SERVICES_CLIENT_ID
  const hasClientSecret = !!process.env.PDF_SERVICES_CLIENT_SECRET
  
  return NextResponse.json({
    PDF_SERVICES_CLIENT_ID: hasClientId ? `SET (${process.env.PDF_SERVICES_CLIENT_ID?.substring(0, 10)}...)` : 'NOT SET',
    PDF_SERVICES_CLIENT_SECRET: hasClientSecret ? 'SET' : 'NOT SET',
    allEnvVars: Object.keys(process.env).filter(key => key.includes('PDF_SERVICES')),
  })
}
