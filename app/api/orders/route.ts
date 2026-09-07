import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sql, ensureTables } from '@/lib/db';

const META_PIXEL_ID = '1033463112850233';
const META_API_VERSION = 'v23.0';

function sha256(value: string) {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('212')) return digits;
  if (digits.startsWith('0')) return `212${digits.slice(1)}`;
  return digits;
}

async function sendMetaPurchase(params: {
  req: NextRequest;
  eventId: string;
  totalAmount: number;
  quantity: number;
  offerTitle: string;
  offerDescription?: string;
  name: string;
  phone: string;
}) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('META_CAPI_ACCESS_TOKEN is not configured; skipping server-side Meta Purchase event.');
    return;
  }

  const normalizedPhone = normalizePhone(params.phone);
  const forwardedFor = params.req.headers.get('x-forwarded-for');
  const clientIp = forwardedFor?.split(',')[0]?.trim() || undefined;
  const userAgent = params.req.headers.get('user-agent') || undefined;

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        action_source: 'website',
        event_source_url: params.req.headers.get('referer') || 'https://okanutrition.com/',
        user_data: {
          ...(normalizedPhone ? { ph: [sha256(normalizedPhone)] } : {}),
          ...(params.name ? { fn: [sha256(params.name)] } : {}),
          ...(clientIp ? { client_ip_address: clientIp } : {}),
          ...(userAgent ? { client_user_agent: userAgent } : {}),
        },
        custom_data: {
          currency: 'MAD',
          value: Number(params.totalAmount),
          content_name: params.offerTitle,
          content_type: 'product',
          num_items: Number(params.quantity || 1),
          contents: [
            {
              id: params.offerDescription || params.offerTitle,
              quantity: Number(params.quantity || 1),
              item_price: Number(params.totalAmount),
            },
          ],
        },
      },
    ],
  };

  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('Meta CAPI Purchase failed:', response.status, text);
  }
}

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
    const eventId = orderId ? `oka_order_${orderId}` : `oka_order_${crypto.randomUUID()}`;

    try {
      await sendMetaPurchase({
        req,
        eventId,
        totalAmount: Number(totalAmount),
        quantity: Number(quantity || 1),
        offerTitle,
        offerDescription,
        name,
        phone,
      });
    } catch (metaError) {
      console.error('Meta CAPI error:', metaError);
    }

    return NextResponse.json({ ok: true, orderId, metaEventId: eventId });
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
