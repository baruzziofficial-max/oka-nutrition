import 'server-only';

import { getIntegrationSecret } from '@/lib/integration-secrets';

const RAPID_DELIVERY_API_BASE_URL = 'https://www.rapiddelivery.ma/api/v1';

type RapidDeliveryCity = {
  key: number | string;
  city_name: string;
};

type RapidDeliveryShop = {
  key: number | string;
  name: string;
};

type RapidDeliveryParcelResponse = {
  message?: string;
  data?: {
    key?: number | string;
    tracking_number?: number | string;
    city_id?: number | string;
    shop_id?: number | string;
  };
};

export type RapidDeliveryOrder = {
  id: number;
  name: string;
  phone: string;
  city: string;
  address: string;
  offerTitle: string;
  quantity: number;
  totalAmount: number;
};

export type RapidDeliverySyncResult = {
  trackingNumber: string;
  cityId: number;
  shopId: number;
};

export class RapidDeliveryError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'RapidDeliveryError';
  }
}

async function getApiToken() {
  const token =
    process.env.RAPIDDELIVERY_API_TOKEN?.trim() ||
    (await getIntegrationSecret('rapid_delivery_api_token'));
  if (!token) {
    throw new RapidDeliveryError("La connexion à Rapide Delivery n'est pas encore configurée.");
  }
  return token;
}

function normalizeLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function normalizeMoroccanPhone(value: string) {
  let digits = value.replace(/\D/g, '');

  if (digits.startsWith('00212')) digits = digits.slice(2);
  if (digits.startsWith('212')) digits = `0${digits.slice(3)}`;
  if (/^[567]\d{8}$/.test(digits)) digits = `0${digits}`;

  if (!/^0\d{9}$/.test(digits)) {
    throw new RapidDeliveryError('Le numéro de téléphone doit être un numéro marocain valide.');
  }

  return digits;
}

function numericId(value: number | string | undefined, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new RapidDeliveryError(`${label} Rapide Delivery invalide.`);
  }
  return parsed;
}

function apiErrorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === 'object') {
    const candidate = payload as { message?: unknown; error?: unknown };
    const message =
      typeof candidate.message === 'string'
        ? candidate.message
        : typeof candidate.error === 'string'
          ? candidate.error
          : null;

    if (message) return `Rapide Delivery : ${message.slice(0, 240)}`;
  }

  return `Rapide Delivery a refusé la demande (erreur ${status}).`;
}

async function rapidDeliveryFetch<T>(
  path: string,
  init?: RequestInit,
  tokenOverride?: string
): Promise<T> {
  const response = await fetch(`${RAPID_DELIVERY_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${tokenOverride || (await getApiToken())}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });

  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    throw new RapidDeliveryError(apiErrorMessage(payload, response.status), response.status);
  }

  if (payload === null) {
    throw new RapidDeliveryError('Rapide Delivery a renvoyé une réponse vide.');
  }

  return payload;
}

export async function testRapidDeliveryConnection(token: string) {
  const cleanToken = token.trim();
  if (cleanToken.length < 10) {
    throw new RapidDeliveryError('Le jeton API Rapide Delivery est invalide.');
  }

  const [shopsPayload, citiesPayload] = await Promise.all([
    rapidDeliveryFetch<RapidDeliveryShop[] | { data?: RapidDeliveryShop[] }>(
      '/shops',
      undefined,
      cleanToken
    ),
    rapidDeliveryFetch<RapidDeliveryCity[] | { data?: RapidDeliveryCity[] }>(
      '/cities',
      undefined,
      cleanToken
    ),
  ]);
  const shops = unwrapList(shopsPayload, 'boutiques');
  const cities = unwrapList(citiesPayload, 'villes');

  if (shops.length === 0 || cities.length === 0) {
    throw new RapidDeliveryError('Le compte Rapide Delivery ne contient aucune boutique ou ville.');
  }

  return {
    shopName: shops.length === 1 ? shops[0].name : null,
    shopCount: shops.length,
    cityCount: cities.length,
  };
}

function unwrapList<T>(payload: T[] | { data?: T[] }, label: string) {
  const list = Array.isArray(payload) ? payload : payload.data;
  if (!Array.isArray(list)) {
    throw new RapidDeliveryError(`La liste des ${label} Rapide Delivery est invalide.`);
  }
  return list;
}

async function getCities() {
  const payload = await rapidDeliveryFetch<RapidDeliveryCity[] | { data?: RapidDeliveryCity[] }>(
    '/cities'
  );
  return unwrapList(payload, 'villes');
}

async function resolveCityId(cityName: string) {
  const cities = await getCities();
  const aliases: Record<string, string> = {
    casa: 'casablanca',
    marrakesh: 'marrakech',
    tangier: 'tanger',
  };
  const requested = aliases[normalizeLabel(cityName)] ?? normalizeLabel(cityName);

  const exact = cities.find((city) => normalizeLabel(city.city_name) === requested);
  if (exact) return numericId(exact.key, 'Ville');

  const compatible = cities.filter((city) => {
    const candidate = normalizeLabel(city.city_name);
    return candidate.startsWith(`${requested} `) || requested.startsWith(`${candidate} `);
  });

  if (compatible.length === 1) return numericId(compatible[0].key, 'Ville');

  throw new RapidDeliveryError(
    `La ville « ${cityName.trim()} » n'a pas été reconnue par Rapide Delivery.`
  );
}

async function resolveShopId() {
  const configuredId = process.env.RAPIDDELIVERY_SHOP_ID?.trim();
  if (configuredId) return numericId(configuredId, 'Boutique');

  const payload = await rapidDeliveryFetch<RapidDeliveryShop[] | { data?: RapidDeliveryShop[] }>(
    '/shops'
  );
  const shops = unwrapList(payload, 'boutiques');

  if (shops.length === 1) return numericId(shops[0].key, 'Boutique');

  const configuredName = process.env.RAPIDDELIVERY_SHOP_NAME?.trim() || 'Oka nutrition';
  const shop = shops.find((item) => normalizeLabel(item.name) === normalizeLabel(configuredName));
  if (!shop) {
    throw new RapidDeliveryError(
      `La boutique « ${configuredName} » n'a pas été trouvée dans Rapide Delivery.`
    );
  }

  return numericId(shop.key, 'Boutique');
}

export async function createRapidDeliveryParcel(
  order: RapidDeliveryOrder
): Promise<RapidDeliverySyncResult> {
  const [cityId, shopId] = await Promise.all([
    resolveCityId(order.city),
    resolveShopId(),
  ]);

  const payload = await rapidDeliveryFetch<RapidDeliveryParcelResponse>('/parcels', {
    method: 'POST',
    body: JSON.stringify({
      article: `DHT Control x${order.quantity}`,
      price: order.totalAmount,
      phone: normalizeMoroccanPhone(order.phone),
      city: cityId,
      shop: shopId,
      address: order.address.trim(),
      recipient: order.name.trim(),
      remark: `Commande Öka #${order.id} — ${order.offerTitle}`.slice(0, 240),
    }),
  });

  const trackingNumber = payload.data?.key ?? payload.data?.tracking_number;
  if (trackingNumber === undefined || trackingNumber === null || String(trackingNumber).trim() === '') {
    throw new RapidDeliveryError("Rapide Delivery n'a pas renvoyé de numéro de suivi.");
  }

  return {
    trackingNumber: String(trackingNumber),
    cityId,
    shopId,
  };
}
