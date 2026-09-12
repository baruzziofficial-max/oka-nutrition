import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const result = await sql`SELECT id, product_name, quantity FROM stock ORDER BY product_name;`;
    return NextResponse.json({ ok: true, stock: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, quantity } = await req.json();

    if (typeof id !== 'number' || typeof quantity !== 'number' || quantity < 0) {
      return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
    }

    await sql`UPDATE stock SET quantity = ${quantity} WHERE id = ${id};`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
