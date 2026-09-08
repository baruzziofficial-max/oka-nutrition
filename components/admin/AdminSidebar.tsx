'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/commandes', label: 'Commandes' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/stock', label: 'Stock' },
  { href: '/admin/statistiques', label: 'Statistiques' },
  { href: '/admin/integrations', label: 'Intégrations', bossOnly: true },
];

export default function AdminSidebar({ role }: { role: 'worker' | 'boss' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleLinks = links.filter((link) => !link.bossOnly || role === 'boss');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/worker');
  };

  const SidebarContent = (
    <>
      <div className="p-5 border-b border-white/10 flex flex-col items-center">
        <Image
          src="/images/logo-new.png"
          alt="OKA Nutrition"
          width={80}
          height={80}
          className="h-14 w-auto object-contain"
        />
        <p className="text-xs text-blue-light/70 mt-2 capitalize">Connecté : {role}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {visibleLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              pathname === link.href
                ? 'bg-white text-blue-dark'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full text-sm font-medium text-red-300 hover:bg-white/10 rounded-lg px-3 py-2.5 transition"
        >
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div
        style={{ backgroundColor: '#0E1C4D' }}
        className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-40"
      >
        <Image
          src="/images/logo-new.png"
          alt="OKA Nutrition"
          width={60}
          height={60}
          className="h-9 w-auto object-contain"
        />
        <button
          onClick={() => setMobileOpen(true)}
          className="text-white p-2"
          aria-label="Ouvrir le menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile overlay + slide-in menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            style={{ backgroundColor: '#0E1C4D' }}
            className="w-64 flex flex-col h-full"
          >
            <div className="flex justify-end p-3">
              <button
                onClick={() => setMobileOpen(false)}
                className="text-white p-1"
                aria-label="Fermer le menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {SidebarContent}
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        style={{ backgroundColor: '#0E1C4D' }}
        className="hidden md:flex w-56 flex-col shrink-0 min-h-screen"
      >
        {SidebarContent}
      </aside>
    </>
  );
}
