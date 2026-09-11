import { sql } from '@vercel/postgres';

export async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL,
      offer_title TEXT NOT NULL,
      offer_description TEXT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      total_amount NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'Nouvelle',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS rapid_tracking_number TEXT;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS rapid_status TEXT;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS rapid_city_id INT;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS rapid_shop_id INT;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS rapid_synced_at TIMESTAMPTZ;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS rapid_sync_started_at TIMESTAMPTZ;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS rapid_sync_error TEXT;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS rapid_state_date TIMESTAMPTZ;`;

  // Keep the original visitor attribution so a Purchase can be sent only
  // after a real order is confirmed by the team.
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS meta_fbp TEXT;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS meta_fbc TEXT;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS meta_client_ip TEXT;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS meta_client_user_agent TEXT;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS meta_event_source_url TEXT;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS meta_purchase_sent_at TIMESTAMPTZ;`;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS orders_rapid_tracking_number_unique
    ON orders (rapid_tracking_number)
    WHERE rapid_tracking_number IS NOT NULL;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rapid_delivery_webhook_events (
      event_id TEXT PRIMARY KEY,
      event_name TEXT NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS integration_secrets (
      secret_key TEXT PRIMARY KEY,
      encrypted_value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS stock (
      id SERIAL PRIMARY KEY,
      product_name TEXT NOT NULL UNIQUE,
      quantity INT NOT NULL DEFAULT 0
    );
  `;

  await sql`
    INSERT INTO stock (product_name, quantity)
    VALUES ('DHT Control', 100)
    ON CONFLICT (product_name) DO NOTHING;
  `;
}

export { sql };
