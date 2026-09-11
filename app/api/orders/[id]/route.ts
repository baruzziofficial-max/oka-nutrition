import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureTables } from '@/lib/db';
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

    await ensureTables();
    const rawParams = await params;
    const id = parseOrderId(rawParams.id);
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Invalid order ID' }, { status: 400 });
    }

    const { status } = await req.json();

    const validStatuses = ['Nouvelle', 'Confirmée', 'Expédiée', 'Livrée', 'Annulée'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });
    }

    const updateResult = await sql`
      UPDATE orders SET status = ${status} WHERE id = ${id} RETURNING id;
    `;
    if (updateResult.rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    }

    let metaPurchaseSent = false;
    let metaError: string | null = null;
    let rapidError: string | null = null;
    let rapidSynced = false;

    if (status === 'Confirmée') {
      // A real Meta Purchase is emitted only here, once the team has verified the COD order.
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

    await ensureTables();
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
