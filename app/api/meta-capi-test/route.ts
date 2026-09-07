import { NextResponse } from 'next/server';
import crypto from 'crypto';

const META_PIXEL_ID = '1033463112850233';
const META_API_VERSION = 'v23.0';
const TEST_EVENT_CODE = 'TEST84170';
const ONE_TIME_KEY = 'oka-capi-test-7f3d9c1a';

function sha256(value: string) {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('key') !== ONE_TIME_KEY) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: 'META_CAPI_ACCESS_TOKEN missing' }, { status: 500 });
  }

  const eventId = `oka_capi_test_${crypto.randomUUID()}`;
  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: 'https://www.okanutrition.com/',
        user_data: {
          em: [sha256('capi-test@okanutrition.com')],
          client_user_agent: request.headers.get('user-agent') || 'OKA CAPI test',
        },
        custom_data: {
          currency: 'MAD',
          value: 1,
          content_name: 'OKA CAPI test',
          content_type: 'product',
          num_items: 1,
        },
      },
    ],
    test_event_code: TEST_EVENT_CODE,
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

  const text = await response.text();
  return NextResponse.json({ ok: response.ok, status: response.status, eventId, meta: text });
}
