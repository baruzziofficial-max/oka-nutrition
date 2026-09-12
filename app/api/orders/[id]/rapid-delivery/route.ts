import { NextResponse } from 'next/server';
import { getCurrentRole } from '@/lib/auth';
import { sql } from '@/lib/db';
import { syncOrderWithRapidDelivery } from '@/lib/order-rapid-delivery';

function parseOrderId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(
  _req: Request,
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

    const statusResult = await sql`SELECT status FROM orders WHERE id = ${id};`;
    const order = statusResult.rows[0];
    if (!order) {
      return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'Confirmée') {
      return NextResponse.json(
        { ok: false, error: "Confirmez d'abord la commande avant de l'envoyer." },
        { status: 409 }
      );
    }

    const result = await syncOrderWithRapidDelivery(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible d'envoyer la commande à Rapide Delivery.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
