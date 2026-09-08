import { NextResponse } from 'next/server';
import { getCurrentRole } from '@/lib/auth';
import {
  hasIntegrationSecret,
  setIntegrationSecret,
} from '@/lib/integration-secrets';
import { testRapidDeliveryConnection } from '@/lib/rapid-delivery';

async function requireBoss() {
  return (await getCurrentRole()) === 'boss';
}

async function configurationState() {
  const [storedToken, storedWebhookSecret] = await Promise.all([
    hasIntegrationSecret('rapid_delivery_api_token'),
    hasIntegrationSecret('rapid_delivery_webhook_secret'),
  ]);

  return {
    tokenConfigured: Boolean(process.env.RAPIDDELIVERY_API_TOKEN?.trim()) || storedToken,
    webhookConfigured:
      Boolean(process.env.RAPIDDELIVERY_WEBHOOK_SECRET?.trim()) || storedWebhookSecret,
    webhookUrl: 'https://okanutrition.com/api/webhooks/rapid-delivery',
  };
}

export async function GET() {
  try {
    if (!(await requireBoss())) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ ok: true, ...(await configurationState()) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: 'Impossible de lire la configuration.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireBoss())) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as { apiToken?: unknown; webhookSecret?: unknown };
    const apiToken = typeof body.apiToken === 'string' ? body.apiToken.trim() : '';
    const webhookSecret =
      typeof body.webhookSecret === 'string' ? body.webhookSecret.trim() : '';

    if (!apiToken && !webhookSecret) {
      return NextResponse.json(
        { ok: false, error: 'Saisissez au moins une clé.' },
        { status: 400 }
      );
    }
    if (webhookSecret && webhookSecret.length < 16) {
      return NextResponse.json(
        { ok: false, error: 'Le secret webhook est invalide.' },
        { status: 400 }
      );
    }

    const connection = apiToken ? await testRapidDeliveryConnection(apiToken) : null;

    if (apiToken) await setIntegrationSecret('rapid_delivery_api_token', apiToken);
    if (webhookSecret) {
      await setIntegrationSecret('rapid_delivery_webhook_secret', webhookSecret);
    }

    return NextResponse.json({
      ok: true,
      ...(await configurationState()),
      connection,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Configuration impossible.';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
