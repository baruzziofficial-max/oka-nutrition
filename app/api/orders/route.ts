import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureTables } from '@/lib/db';
import { getCurrentRole } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await ensureTables();

    const body = await req.json();
    const { name, phone, city, address, offerTitle, offerDescription, quantity, totalAmount } = body;

    if (!name || !phone || !city || !offerTitle || !totalAmount) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 });
    }

    const normalizedQuantity = Number(quantity || 1);
    const normalizedTotal = Number(totalAmount);
    const isKnownOffer =
      (normalizedQuantity === 1 && normalizedTotal === 175) ||
      (normalizedQuantity === 3 && normalizedTotal === 349);

    if (!isKnownOffer) {
      return NextResponse.json({ ok: false, error: 'Invalid offer' }, { status: 400 });
    }

    const cleanName = String(name).trim().slice(0, 120);
    const cleanPhone = String(phone).trim().slice(0, 30);
    const cleanCity = String(city).trim().slice(0, 120);
    const cleanAddress = String(address || '').trim().slice(0, 500);
    const cleanOfferTitle = String(offerTitle).trim().slice(0, 160);
    const cleanOfferDescription = String(offerDescription || '').trim().slice(0, 240);

    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || null;
    const userAgent = req.headers.get('user-agent') || null;
    const eventSourceUrl = req.headers.get('referer') || 'https://okanutrition.com/';
    const fbp = req.cookies.get('_fbp')?.value || null;
    const fbc = req.cookies.get('_fbc')?.value || null;

    const result = await sql`
      INSERT INTO orders (
        name, phone, city, address, offer_title, offer_description,
        quantity, total_amount, status,
        meta_fbp, meta_fbc, meta_client_ip, meta_client_user_agent, meta_event_source_url
      )
      VALUES (
        ${cleanName}, ${cleanPhone}, ${cleanCity}, ${cleanAddress},
        ${cleanOfferTitle}, ${cleanOfferDescription}, ${normalizedQuantity},
        ${normalizedTotal}, 'Nouvelle', ${fbp}, ${fbc}, ${clientIp}, ${userAgent}, ${eventSourceUrl}
      )
      RETURNING id;
    `;

    const orderId = result.rows[0]?.id ?? null;

    // A saved COD form is a lead/order request. Address can be completed
    // during confirmation and Purchase is emitted only after staff confirmation.
    return NextResponse.json({ ok: true, orderId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const role = await getCurrentRole();
    if (!role) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    await ensureTables();
    const result = await sql`
      SELECT id, name, phone, city, address, offer_title, offer_description,
             quantity, total_amount, status, created_at,
             rapid_tracking_number, rapid_status, rapid_synced_at, rapid_sync_error
      FROM orders
      ORDER BY created_at DESC;
    `;
    return NextResponse.json({ ok: true, orders: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
