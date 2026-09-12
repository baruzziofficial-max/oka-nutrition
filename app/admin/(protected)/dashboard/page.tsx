import { sql } from '@/lib/db';
import { getCurrentRole } from '@/lib/auth';

export default async function DashboardPage() {
  const role = await getCurrentRole();
  const isWorker = role === 'worker';

  const [todayResult, pendingResult, monthRevenueResult, recentOrders] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS count FROM orders WHERE created_at::date = CURRENT_DATE;
    `,
    sql`
      SELECT COUNT(*)::int AS count FROM orders WHERE status = 'Nouvelle';
    `,
    sql`
      SELECT COALESCE(SUM(total_amount), 0)::float AS total
      FROM orders
      WHERE status != 'Annulée' AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE);
    `,
    sql`
      SELECT id, name, city, offer_title, total_amount, status, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 5;
    `,
  ]);

  const todayCount = todayResult.rows[0]?.count ?? 0;
  const pendingCount = pendingResult.rows[0]?.count ?? 0;
  const monthRevenue = monthRevenueResult.rows[0]?.total ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      <div className={`grid grid-cols-1 sm:grid-cols-${isWorker ? '2' : '3'} gap-4 mt-6`}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Commandes aujourd&apos;hui</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{todayCount}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Commandes en attente</p>
          <p className="text-3xl font-bold text-orange-500 mt-1">{pendingCount}</p>
        </div>
        {!isWorker && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Chiffre d&apos;affaires (ce mois)</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{monthRevenue} DH</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-8 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Dernières commandes</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3">Ville</th>
              <th className="px-5 py-3">Offre</th>
              <th className="px-5 py-3">Montant</th>
              <th className="px-5 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.rows.map((order) => (
              <tr key={order.id} className="border-t border-gray-100">
                <td className="px-5 py-3">{order.name}</td>
                <td className="px-5 py-3">{order.city}</td>
                <td className="px-5 py-3">{order.offer_title}</td>
                <td className="px-5 py-3">{order.total_amount} DH</td>
                <td className="px-5 py-3">{order.status}</td>
              </tr>
            ))}
            {recentOrders.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-gray-400">
                  Aucune commande pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
