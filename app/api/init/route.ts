import { NextResponse } from 'next/server';
import { ensureTables } from '@/lib/db';

export async function GET() {
  try {
    // Explicit migration endpoint: schema changes must not run in normal request paths.
    await ensureTables();
    return NextResponse.json({ ok: true, message: 'Tables created.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
