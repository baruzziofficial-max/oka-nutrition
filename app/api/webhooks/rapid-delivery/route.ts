import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getIntegrationSecret } from '@/lib/integration-secrets';

type RapidDeliveryWebhook = {
  id?: string;
  event?: string;
  created_at?: string;
  data?: {
    parcel?: {
      tracking_number?: number | string;
      state_date?: string;
    };
    status?: {
      id?: number;
      name?: string;
    };
  };
};

function signatureParts(header: string) {
  return Object.fromEntries(
    header
      .split(',')
      .map((part) => part.trim().split('='))
      .filter((part) => part.length === 2 && part[0] && part[1])
  );
}

function isValidSignature(rawBody: string, signatureHeader: string, secret: string) {
  const parts = signatureParts(signatureHeader);
  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature || !/^\d+$/.test(timestamp) || !/^[a-f\d]+$/i.test(signature)) {
    return false;
  }

  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const providedBuffer = Buffer.from(signature, 'hex');

  return (
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

function localStatusFor(rapidStatus: string) {
  const normalized = rapidStatus
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');

  if (/\blivree?\b/.test(normalized)) return 'Livrée';
  if (/(annul|refus|retour)/.test(normalized)) return 'Annulée';
  if (/en attente.*ramass/.test(normalized)) return 'Confirmée';
  if (/(expedi|ramasse|distribution|en cours de livraison)/.test(normalized)) return 'Expédiée';
  if (/(confirme)/.test(normalized)) return 'Confirmée';
  return null;
}

export async function POST(req: Request) {
  const secret =
    process.env.RAPIDDELIVERY_WEBHOOK_SECRET?.trim() ||
    (await getIntegrationSecret('rapid_delivery_webhook_secret'));
  if (!secret) {
    console.error('RAPIDDELIVERY_WEBHOOK_SECRET is not configured.');
    return NextResponse.json({ received: false }, { status: 503 });
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-webhook-signature') || '';
  if (!isValidSignature(rawBody, signatureHeader, secret)) {
    return NextResponse.json({ received: false, error: 'Invalid signature' }, { status: 400 });
  }

  let payload: RapidDeliveryWebhook;
  try {
    payload = JSON.parse(rawBody) as RapidDeliveryWebhook;
  } catch {
    return NextResponse.json({ received: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const eventId = req.headers.get('x-webhook-id') || payload.id;
  const eventName = req.headers.get('x-webhook-event') || payload.event;
  const trackingNumber = payload.data?.parcel?.tracking_number;
  const rapidStatus = payload.data?.status?.name;

  if (!eventId || !eventName || trackingNumber === undefined || !rapidStatus) {
    return NextResponse.json({ received: false, error: 'Invalid event' }, { status: 400 });
  }

  const client = await sql.connect();

  try {
    await client.sql`BEGIN;`;

    const eventResult = await client.sql`
      INSERT INTO rapid_delivery_webhook_events (event_id, event_name)
      VALUES (${eventId}, ${eventName})
      ON CONFLICT (event_id) DO NOTHING
      RETURNING event_id;
    `;

    if (eventResult.rows.length === 0) {
      await client.sql`COMMIT;`;
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (eventName === 'parcel.state_changed') {
      const stateDateValue = payload.data?.parcel?.state_date || payload.created_at;
      const parsedStateDate = stateDateValue ? new Date(stateDateValue) : new Date();
      const stateDate = Number.isNaN(parsedStateDate.getTime()) ? new Date() : parsedStateDate;
      const localStatus = localStatusFor(rapidStatus);

      await client.sql`
        UPDATE orders
        SET rapid_status = ${rapidStatus},
            rapid_state_date = ${stateDate.toISOString()},
            status = COALESCE(${localStatus}, status)
        WHERE rapid_tracking_number = ${String(trackingNumber)}
          AND (rapid_state_date IS NULL OR rapid_state_date <= ${stateDate.toISOString()});
      `;
    }

    await client.sql`COMMIT;`;
  } catch (error) {
    await client.sql`ROLLBACK;`.catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  return NextResponse.json({ received: true });
}
