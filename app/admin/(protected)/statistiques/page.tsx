import { sql } from '@/lib/db';
import { getCurrentRole } from '@/lib/auth';

export default async function StatistiquesPage() {
  const role = await getCurrentRole();
  const isWorker = role === 'worker';

  const [
    totalRevenueResult,
    totalOrdersResult,
    byStatusResult,
    byOfferResult,
    last30DaysResult,
  ] = await Promise.all([
    sql`
      SELECT COALESCE(SUM(total_amount), 0)::float AS total FROM orders WHERE status != 'Annulée';
    `,
    sql`SELECT COUNT(*)::int AS count FROM orders;`,
    sql`
      SELECT status, COUNT(*)::int AS count
      FROM orders
      GROUP BY status;
    `,
    sql`
      SELECT offer_title, COUNT(*)::int AS count, COALESCE(SUM(total_amount), 0)::float AS revenue
      FROM orders
      WHERE status != 'Annulée'
      GROUP BY offer_title
      ORDER BY count DESC;
    `,
    sql`
      SELECT created_at::date AS day, COUNT(*)::int AS count
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC;
    `,
  ]);

  const totalRevenue = totalRevenueResult.rows[0]?.total ?? 0;
  const totalOrders = totalOrdersResult.rows[0]?.count ?? 0;
  const byStatus = byStatusResult.rows;
  const byOffer = byOfferResult.rows;
  const last30Days = last30DaysResult.rows;

  const maxDayCount = Math.max(1, ...last30Days.map((d) => d.count));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Statistiques</h1>

      <div className={`grid grid-cols-1 sm:grid-cols-${isWorker ? '1' : '2'} gap-4 mt-6`}>
        {!isWorker && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Chiffre d&apos;affaires total</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{totalRevenue} DH</p>
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Nombre total de commandes</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{totalOrders}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-gray-800 mb-4">Répartition par statut</h2>
          <div className="space-y-3">
            {byStatus.map((row) => (
              <div key={row.status} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{row.status}</span>
                <span className="font-semibold text-gray-800">{row.count}</span>
              </div>
            ))}
            {byStatus.length === 0 && (
              <p className="text-sm text-gray-400">Aucune donnée.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-gray-800 mb-4">Ventes par offre</h2>
          <div className="space-y-3">
            {byOffer.map((row) => (
              <div key={row.offer_title} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{row.offer_title}</span>
                <span className="font-semibold text-gray-800">
                  {row.count}{!isWorker && ` — ${row.revenue} DH`}
                </span>
              </div>
            ))}
            {byOffer.length === 0 && (
              <p className="text-sm text-gray-400">Aucune donnée.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-6 p-5">
        <h2 className="font-bold text-gray-800 mb-4">Commandes — 30 derniers jours</h2>
        {last30Days.length === 0 && <p className="text-sm text-gray-400">Aucune donnée.</p>}
        {last30Days.length > 0 && (
          <div className="flex items-end gap-1 h-40">
            {last30Days.map((d) => (
              <div
                key={d.day}
                className="flex-1 bg-blue-500 rounded-t"
                style={{ height: `${(d.count / maxDayCount) * 100}%` }}
                title={`${new Date(d.day).toLocaleDateString('fr-FR')} — ${d.count} commande(s)`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
