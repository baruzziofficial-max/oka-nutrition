import crypto from 'crypto';

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

type ConfirmedOrderForMeta = {
  id: number;
  name: string;
  phone: string;
  offer_title: string;
  offer_description?: string | null;
  quantity: number;
  total_amount: number | string;
  meta_fbp?: string | null;
  meta_fbc?: string | null;
  meta_client_ip?: string | null;
  meta_client_user_agent?: string | null;
  meta_event_source_url?: string | null;
};

export async function sendConfirmedOrderPurchase(order: ConfirmedOrderForMeta) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('META_CAPI_ACCESS_TOKEN is not configured');
  }

  const normalizedPhone = normalizePhone(order.phone || '');
  const eventId = `oka_confirmed_order_${order.id}`;

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: order.meta_event_source_url || 'https://okanutrition.com/',
        user_data: {
          ...(normalizedPhone ? { ph: [sha256(normalizedPhone)] } : {}),
          ...(order.name ? { fn: [sha256(order.name)] } : {}),
          ...(order.meta_fbp ? { fbp: order.meta_fbp } : {}),
          ...(order.meta_fbc ? { fbc: order.meta_fbc } : {}),
          ...(order.meta_client_ip ? { client_ip_address: order.meta_client_ip } : {}),
          ...(order.meta_client_user_agent
            ? { client_user_agent: order.meta_client_user_agent }
            : {}),
        },
        custom_data: {
          currency: 'MAD',
          value: Number(order.total_amount),
          content_name: order.offer_title,
          content_type: 'product',
          num_items: Number(order.quantity || 1),
          contents: [
            {
              id: order.offer_title,
              quantity: Number(order.quantity || 1),
              item_price: Number(order.total_amount),
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
    throw new Error(`Meta CAPI Purchase failed: ${response.status} ${text}`);
  }

  return eventId;
}
