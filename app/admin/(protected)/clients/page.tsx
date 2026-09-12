import { sql } from '@/lib/db';

export default async function ClientsPage() {
  const result = await sql`
    SELECT
      phone,
      MAX(name) AS name,
      MAX(city) AS city,
      MAX(address) AS address,
      COUNT(*)::int AS orders_count,
      COALESCE(SUM(total_amount), 0)::float AS total_spent,
      MAX(created_at) AS last_order
    FROM orders
    GROUP BY phone
    ORDER BY last_order DESC;
  `;

  const clients = result.rows;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
      <p className="text-sm text-gray-500 mt-1">
        {clients.length} client{clients.length !== 1 ? 's' : ''} au total
      </p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-5 overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Ville</th>
              <th className="px-4 py-3">Adresse</th>
              <th className="px-4 py-3">Nb commandes</th>
              <th className="px-4 py-3">Total dépensé</th>
              <th className="px-4 py-3">Dernière commande</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Aucun client pour le moment.
                </td>
              </tr>
            )}
            {clients.map((client) => (
              <tr key={client.phone} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-800">{client.name}</td>
                <td className="px-4 py-3">{client.phone}</td>
                <td className="px-4 py-3">{client.city}</td>
                <td className="px-4 py-3 max-w-[200px] truncate" title={client.address}>
                  {client.address}
                </td>
                <td className="px-4 py-3">{client.orders_count}</td>
                <td className="px-4 py-3">{client.total_spent} DH</td>
                <td className="px-4 py-3">
                  {new Date(client.last_order).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
