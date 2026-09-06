import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureTables } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await ensureTables();

    const body = await req.json();
    const { name, phone, city, address, offerTitle, offerDescription, quantity, totalAmount } = body;

    if (!name || !phone || !city || !address || !offerTitle || !totalAmount) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO orders (name, phone, city, address, offer_title, offer_description, quantity, total_amount, status)
      VALUES (${name}, ${phone}, ${city}, ${address}, ${offerTitle}, ${offerDescription}, ${quantity}, ${totalAmount}, 'Nouvelle')
      RETURNING id;
    `;

    const orderId = result.rows[0]?.id ?? null;

    return NextResponse.json({ ok: true, orderId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureTables();
    const result = await sql`
      SELECT id, name, phone, city, address, offer_title, offer_description, quantity, total_amount, status, created_at
      FROM orders
      ORDER BY created_at DESC;
    `;
    return NextResponse.json({ ok: true, orders: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
