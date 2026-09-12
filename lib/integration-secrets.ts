import 'server-only';

import crypto from 'crypto';
import { sql } from '@/lib/db';

export type IntegrationSecretKey =
  | 'rapid_delivery_api_token'
  | 'rapid_delivery_webhook_secret';

function encryptionKey() {
  const keyMaterial =
    process.env.INTEGRATION_ENCRYPTION_KEY?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim();

  if (!keyMaterial) {
    throw new Error('Aucune clé de chiffrement serveur n’est configurée.');
  }

  return crypto.createHash('sha256').update(`oka-integrations:v1:${keyMaterial}`).digest();
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted].map((part) => part.toString('base64url')).join('.');
}

function decrypt(value: string) {
  const [ivValue, authTagValue, encryptedValue] = value.split('.');
  if (!ivValue || !authTagValue || !encryptedValue) {
    throw new Error('Secret d’intégration invalide.');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivValue, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export async function setIntegrationSecret(key: IntegrationSecretKey, value: string) {
  const encryptedValue = encrypt(value.trim());

  await sql`
    INSERT INTO integration_secrets (secret_key, encrypted_value, updated_at)
    VALUES (${key}, ${encryptedValue}, now())
    ON CONFLICT (secret_key)
    DO UPDATE SET encrypted_value = EXCLUDED.encrypted_value, updated_at = now();
  `;
}

export async function getIntegrationSecret(key: IntegrationSecretKey) {
  const result = await sql`
    SELECT encrypted_value FROM integration_secrets WHERE secret_key = ${key};
  `;
  const encryptedValue = result.rows[0]?.encrypted_value;
  if (!encryptedValue) return null;

  return decrypt(String(encryptedValue));
}

export async function hasIntegrationSecret(key: IntegrationSecretKey) {
  const result = await sql`
    SELECT EXISTS(
      SELECT 1 FROM integration_secrets WHERE secret_key = ${key}
    ) AS configured;
  `;
  return Boolean(result.rows[0]?.configured);
}
