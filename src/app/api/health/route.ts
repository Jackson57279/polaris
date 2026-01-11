import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    environment: process.env.IS_ELECTRON === 'true' ? 'electron' : 'web'
  });
}
