'use client';

import { useEffect, useState, useMemo } from 'react';

type Order = {
  id: number;
  name: string;
  phone: string;
  city: string;
  address: string;
  offer_title: string;
  offer_description: string;
  quantity: number;
  total_amount: string;
  status: string;
  created_at: string;
  rapid_tracking_number: string | null;
  rapid_status: string | null;
  rapid_synced_at: string | null;
  rapid_sync_error: string | null;
};

const STATUSES = ['Nouvelle', 'Confirmée', 'Expédiée', 'Livrée', 'Annulée'];

export default function CommandesClient({ role }: { role: 'worker' | 'boss' | null }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isBoss = role === 'boss';

  const fetchOrders = async () => {
    setLoading(true);
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (data.ok) setOrders(data.orders);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    fetch('/api/orders')
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data.ok) setOrders(data.orders);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    setActiveOrderId(id);
    setNotice(null);

    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Impossible de modifier la commande.');
      }

      if (data.order) {
        setOrders((prev) => prev.map((order) => (order.id === id ? data.order : order)));
      }

      if (data.rapid?.error) {
        setNotice({
          type: 'error',
          message: `Commande confirmée, mais non envoyée : ${data.rapid.error}`,
        });
      } else if (data.rapid?.synced) {
        setNotice({ type: 'success', message: 'Commande envoyée à Rapide Delivery.' });
      }
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'Une erreur est survenue.',
      });
      await fetchOrders();
    } finally {
      setActiveOrderId(null);
    }
  };

  const handleRapidRetry = async (id: number) => {
    setActiveOrderId(id);
    setNotice(null);

    try {
      const response = await fetch(`/api/orders/${id}/rapid-delivery`, { method: 'POST' });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Impossible d'envoyer la commande.");
      }

      await fetchOrders();
      setNotice({ type: 'success', message: 'Commande envoyée à Rapide Delivery.' });
    } catch (error) {
      await fetchOrders();
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'Une erreur est survenue.',
      });
    } finally {
      setActiveOrderId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer définitivement cette commande ?')) return;
    setOrders((prev) => prev.filter((o) => o.id !== id));
    await fetch(`/api/orders/${id}`, { method: 'DELETE' });
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        search.trim() === '' ||
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.phone.includes(search) ||
        o.city.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'Tous' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const rows = filteredOrders.map((o) => ({
      Nom: o.name,
      Téléphone: o.phone,
      Ville: o.city,
      Adresse: o.address,
      Offre: o.offer_title,
      Quantité: o.quantity,
      'Montant (DH)': o.total_amount,
      Statut: o.status,
      Date: new Date(o.created_at).toLocaleString('fr-FR'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Commandes');
    XLSX.writeFile(workbook, `commandes_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Commandes</h1>
        <button
          onClick={handleExport}
          className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg px-4 py-2 transition"
        >
          Exporter en Excel
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mt-5">
        <input
          type="text"
          placeholder="Rechercher (nom, téléphone, ville)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="Tous">Tous les statuts</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {notice && (
        <div
          role="status"
          className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${
            notice.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-5 overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Ville</th>
              <th className="px-4 py-3">Adresse</th>
              <th className="px-4 py-3">Offre</th>
              <th className="px-4 py-3">Qté</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Rapide Delivery</th>
              <th className="px-4 py-3">Statut</th>
              {isBoss && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={isBoss ? 11 : 10} className="px-4 py-6 text-center text-gray-400">
                  Chargement...
                </td>
              </tr>
            )}
            {!loading && filteredOrders.length === 0 && (
              <tr>
                <td colSpan={isBoss ? 11 : 10} className="px-4 py-6 text-center text-gray-400">
                  Aucune commande trouvée.
                </td>
              </tr>
            )}
            {filteredOrders.map((order) => (
              <tr key={order.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-800">{order.name}</td>
                <td className="px-4 py-3">{order.phone}</td>
                <td className="px-4 py-3">{order.city}</td>
                <td className="px-4 py-3 max-w-[200px] truncate" title={order.address}>
                  {order.address}
                </td>
                <td className="px-4 py-3">{order.offer_title}</td>
                <td className="px-4 py-3">{order.quantity}</td>
                <td className="px-4 py-3">{order.total_amount} DH</td>
                <td className="px-4 py-3">
                  {new Date(order.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3 min-w-[190px] whitespace-normal">
                  {activeOrderId === order.id ? (
                    <span className="text-xs text-gray-500">Synchronisation…</span>
                  ) : order.rapid_tracking_number ? (
                    <div>
                      <p className="font-semibold text-gray-800">
                        Suivi #{order.rapid_tracking_number}
                      </p>
                      <p className="text-xs text-green-700 mt-0.5">
                        {order.rapid_status || 'Envoyée'}
                      </p>
                    </div>
                  ) : order.status === 'Confirmée' ? (
                    <div>
                      {order.rapid_sync_error && (
                        <p className="text-xs text-red-600 mb-1.5" title={order.rapid_sync_error}>
                          {order.rapid_sync_error}
                        </p>
                      )}
                      <button
                        onClick={() => handleRapidRetry(order.id)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        {order.rapid_sync_error ? 'Réessayer' : 'Envoyer maintenant'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Après confirmation</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    disabled={activeOrderId === order.id}
                    className={`text-xs font-semibold rounded-full px-3 py-1.5 border-0 focus:outline-none ${
                      order.status === 'Nouvelle'
                        ? 'bg-blue-100 text-blue-700'
                        : order.status === 'Confirmée'
                        ? 'bg-yellow-100 text-yellow-700'
                        : order.status === 'Expédiée'
                        ? 'bg-purple-100 text-purple-700'
                        : order.status === 'Livrée'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                {isBoss && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="text-red-600 hover:text-red-800 text-xs font-semibold"
                    >
                      Supprimer
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
