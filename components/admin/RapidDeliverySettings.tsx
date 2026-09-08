'use client';

import { FormEvent, useEffect, useState } from 'react';

type Configuration = {
  tokenConfigured: boolean;
  webhookConfigured: boolean;
  webhookUrl: string;
};

export default function RapidDeliverySettings() {
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [apiToken, setApiToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/integrations/rapid-delivery')
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data.ok) {
          setConfiguration({
            tokenConfigured: data.tokenConfigured,
            webhookConfigured: data.webhookConfigured,
            webhookUrl: data.webhookUrl,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessage({ type: 'error', text: 'Impossible de lire la configuration.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if ((!apiToken.trim() && !webhookSecret.trim()) || isSaving) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/integrations/rapid-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken, webhookSecret }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Configuration impossible.');
      }

      setConfiguration({
        tokenConfigured: data.tokenConfigured,
        webhookConfigured: data.webhookConfigured,
        webhookUrl: data.webhookUrl,
      });
      setApiToken('');
      setWebhookSecret('');
      setMessage({
        type: 'success',
        text: data.connection?.shopName
          ? `Connexion réussie avec la boutique ${data.connection.shopName}.`
          : 'Configuration enregistrée en toute sécurité.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Configuration impossible.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800">Rapide Delivery</h1>
      <p className="text-sm text-gray-500 mt-1">
        Les clés sont chiffrées avant leur enregistrement et ne sont jamais réaffichées.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Création des colis</p>
          <p
            className={`font-semibold mt-1 ${
              configuration?.tokenConfigured ? 'text-green-700' : 'text-orange-600'
            }`}
          >
            {configuration?.tokenConfigured ? 'Connectée' : 'Jeton API requis'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Suivi automatique</p>
          <p
            className={`font-semibold mt-1 ${
              configuration?.webhookConfigured ? 'text-green-700' : 'text-orange-600'
            }`}
          >
            {configuration?.webhookConfigured ? 'Connecté' : 'Secret webhook requis'}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mt-6"
      >
        <div>
          <label
            htmlFor="rapid-api-token"
            className="block text-sm font-semibold text-gray-700 mb-1.5"
          >
            Jeton API Rapide Delivery
          </label>
          <input
            id="rapid-api-token"
            type="password"
            value={apiToken}
            onChange={(event) => setApiToken(event.target.value)}
            autoComplete="off"
            placeholder={
              configuration?.tokenConfigured ? 'Remplacer le jeton actuel' : 'Coller le jeton API'
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="mt-5">
          <label
            htmlFor="rapid-webhook-secret"
            className="block text-sm font-semibold text-gray-700 mb-1.5"
          >
            Secret de signature du webhook
          </label>
          <input
            id="rapid-webhook-secret"
            type="password"
            value={webhookSecret}
            onChange={(event) => setWebhookSecret(event.target.value)}
            autoComplete="off"
            placeholder={
              configuration?.webhookConfigured
                ? 'Remplacer le secret actuel'
                : 'Coller le secret affiché une seule fois'
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
          />
        </div>

        {configuration?.webhookUrl && (
          <div className="mt-5 rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              URL du webhook
            </p>
            <p className="text-sm text-gray-800 break-all mt-1 select-all">
              {configuration.webhookUrl}
            </p>
          </div>
        )}

        {message && (
          <p
            role="status"
            className={`mt-5 rounded-lg px-4 py-3 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={(!apiToken.trim() && !webhookSecret.trim()) || isSaving}
          className="mt-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-5 py-3 transition"
        >
          {isSaving ? 'Vérification…' : 'Vérifier et enregistrer'}
        </button>
      </form>
    </div>
  );
}
