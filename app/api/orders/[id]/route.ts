import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentRole } from '@/lib/auth';
import { syncOrderWithRapidDelivery } from '@/lib/order-rapid-delivery';
import { sendConfirmedOrderPurchase } from '@/lib/meta-capi';

async function getOrder(id: number) {
  const result = await sql`
    SELECT id, name, phone, city, address, offer_title, offer_description,
           quantity, total_amount, status, created_at,
           rapid_tracking_number, rapid_status, rapid_synced_at, rapid_sync_error
    FROM orders
    WHERE id = ${id};
  `;
  return result.rows[0] ?? null;
}

async function getOrderForMeta(id: number) {
  const result = await sql`
    SELECT id, name, phone, offer_title, offer_description, quantity, total_amount,
           meta_fbp, meta_fbc, meta_client_ip, meta_client_user_agent,
           meta_event_source_url, meta_purchase_sent_at
    FROM orders
    WHERE id = ${id};
  `;
  return result.rows[0] ?? null;
}

function parseOrderId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getCurrentRole();
    if (!role) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rawParams = await params;
    const id = parseOrderId(rawParams.id);
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Invalid order ID' }, { status: 400 });
    }

    const body = await req.json();
    const hasStatus = typeof body.status === 'string';
    const hasAddress = typeof body.address === 'string';

    if (!hasStatus && !hasAddress) {
      return NextResponse.json({ ok: false, error: 'Nothing to update' }, { status: 400 });
    }

    const validStatuses = ['Nouvelle', 'Confirmée', 'Expédiée', 'Livrée', 'Annulée'];
    if (hasStatus && !validStatuses.includes(body.status)) {
      return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });
    }

    const existing = await getOrder(id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    }

    const cleanAddress = hasAddress ? String(body.address).trim().slice(0, 500) : null;
    const nextAddress = hasAddress ? cleanAddress || '' : String(existing.address || '').trim();

    if (body.status === 'Confirmée' && !nextAddress) {
      return NextResponse.json(
        { ok: false, error: "Ajoutez l'adresse exacte avant de confirmer la commande." },
        { status: 400 }
      );
    }

    if (hasAddress) {
      await sql`UPDATE orders SET address = ${cleanAddress || ''} WHERE id = ${id};`;
    }

    if (hasStatus) {
      await sql`UPDATE orders SET status = ${body.status} WHERE id = ${id};`;
    }

    let metaPurchaseSent = false;
    let metaError: string | null = null;
    let rapidError: string | null = null;
    let rapidSynced = false;

    if (body.status === 'Confirmée') {
      try {
        const metaOrder = await getOrderForMeta(id);
        if (metaOrder && !metaOrder.meta_purchase_sent_at) {
          await sendConfirmedOrderPurchase({
            id: Number(metaOrder.id),
            name: String(metaOrder.name || ''),
            phone: String(metaOrder.phone || ''),
            offer_title: String(metaOrder.offer_title || ''),
            offer_description: metaOrder.offer_description
              ? String(metaOrder.offer_description)
              : null,
            quantity: Number(metaOrder.quantity || 1),
            total_amount: metaOrder.total_amount,
            meta_fbp: metaOrder.meta_fbp ? String(metaOrder.meta_fbp) : null,
            meta_fbc: metaOrder.meta_fbc ? String(metaOrder.meta_fbc) : null,
            meta_client_ip: metaOrder.meta_client_ip ? String(metaOrder.meta_client_ip) : null,
            meta_client_user_agent: metaOrder.meta_client_user_agent
              ? String(metaOrder.meta_client_user_agent)
              : null,
            meta_event_source_url: metaOrder.meta_event_source_url
              ? String(metaOrder.meta_event_source_url)
              : null,
          });

          await sql`
            UPDATE orders
            SET meta_purchase_sent_at = now()
            WHERE id = ${id} AND meta_purchase_sent_at IS NULL;
          `;
          metaPurchaseSent = true;
        }
      } catch (error) {
        metaError = error instanceof Error ? error.message : 'Meta Purchase failed';
        console.error('Meta confirmed Purchase error:', error);
      }

      try {
        await syncOrderWithRapidDelivery(id);
        rapidSynced = true;
      } catch (error) {
        rapidError =
          error instanceof Error
            ? error.message
            : "Impossible d'envoyer la commande à Rapide Delivery.";
      }
    }

    const order = await getOrder(id);

    return NextResponse.json({
      ok: true,
      order,
      meta: { purchaseSent: metaPurchaseSent, error: metaError },
      rapid: { synced: rapidSynced, error: rapidError },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getCurrentRole();
    if (role !== 'boss') {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const rawParams = await params;
    const id = parseOrderId(rawParams.id);
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Invalid order ID' }, { status: 400 });
    }
    await sql`DELETE FROM orders WHERE id = ${id};`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
