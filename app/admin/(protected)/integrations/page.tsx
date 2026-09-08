import { redirect } from 'next/navigation';
import { getCurrentRole } from '@/lib/auth';
import RapidDeliverySettings from '@/components/admin/RapidDeliverySettings';

export default async function IntegrationsPage() {
  const role = await getCurrentRole();
  if (role !== 'boss') redirect('/admin/dashboard');

  return <RapidDeliverySettings />;
}
