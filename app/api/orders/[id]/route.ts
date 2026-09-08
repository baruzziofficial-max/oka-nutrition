import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureTables } from '@/lib/db';
import { getCurrentRole } from '@/lib/auth';
import { syncOrderWithRapidDelivery } from '@/lib/order-rapid-delivery';

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

    let rapidError: string | null = null;
    let rapidSynced = false;

    if (status === 'Confirmée') {
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
