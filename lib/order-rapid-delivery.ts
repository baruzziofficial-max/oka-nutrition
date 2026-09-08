import 'server-only';

import { sql, ensureTables } from '@/lib/db';
import { createRapidDeliveryParcel, RapidDeliveryError } from '@/lib/rapid-delivery';

type ClaimedOrder = {
  id: number;
  name: string;
  phone: string;
  city: string;
  address: string;
  offer_title: string;
  quantity: number;
  total_amount: string | number;
};

export type RapidOrderSyncOutcome = {
  trackingNumber: string;
  alreadySynced: boolean;
};

function safeErrorMessage(error: unknown) {
  if (error instanceof RapidDeliveryError) return error.message;
  if (error instanceof Error && error.name === 'TimeoutError') {
    return "Rapide Delivery n'a pas répondu à temps. Vous pouvez réessayer.";
  }
  return "Impossible d'envoyer la commande à Rapide Delivery pour le moment.";
}

export async function syncOrderWithRapidDelivery(
  orderId: number
): Promise<RapidOrderSyncOutcome> {
  await ensureTables();

  const claimResult = await sql`
    UPDATE orders
    SET rapid_sync_started_at = now(), rapid_sync_error = NULL
    WHERE id = ${orderId}
      AND rapid_tracking_number IS NULL
      AND (
        rapid_sync_started_at IS NULL
        OR rapid_sync_started_at < now() - interval '5 minutes'
      )
    RETURNING id, name, phone, city, address, offer_title, quantity, total_amount;
  `;

  const order = claimResult.rows[0] as ClaimedOrder | undefined;
  if (!order) {
    const existingResult = await sql`
      SELECT rapid_tracking_number, rapid_sync_started_at
      FROM orders
      WHERE id = ${orderId};
    `;
    const existing = existingResult.rows[0];

    if (!existing) throw new RapidDeliveryError('Commande introuvable.');
    if (existing.rapid_tracking_number) {
      return {
        trackingNumber: String(existing.rapid_tracking_number),
        alreadySynced: true,
      };
    }

    throw new RapidDeliveryError('Un envoi vers Rapide Delivery est déjà en cours.');
  }

  try {
    const rapid = await createRapidDeliveryParcel({
      id: order.id,
      name: order.name,
      phone: order.phone,
      city: order.city,
      address: order.address,
      offerTitle: order.offer_title,
      quantity: Number(order.quantity),
      totalAmount: Number(order.total_amount),
    });

    await sql`
      UPDATE orders
      SET rapid_tracking_number = ${rapid.trackingNumber},
          rapid_status = 'Nouveau',
          rapid_city_id = ${rapid.cityId},
          rapid_shop_id = ${rapid.shopId},
          rapid_synced_at = now(),
          rapid_sync_started_at = NULL,
          rapid_sync_error = NULL
      WHERE id = ${orderId};
    `;

    return { trackingNumber: rapid.trackingNumber, alreadySynced: false };
  } catch (error) {
    const message = safeErrorMessage(error);
    await sql`
      UPDATE orders
      SET rapid_sync_started_at = NULL, rapid_sync_error = ${message}
      WHERE id = ${orderId} AND rapid_tracking_number IS NULL;
    `;
    throw new RapidDeliveryError(message);
  }
}
