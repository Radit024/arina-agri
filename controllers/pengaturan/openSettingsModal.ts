import type { Route } from 'next';
import type { useRouter } from 'next/navigation';

/**
 * Pengaturan hanya hidup sebagai modal, bukan route `/dashboard/pengaturan`.
 * Keadaan terbuka dititipkan pada query string supaya bisa dipanggil dari
 * sidebar, bottom nav, maupun onboarding tanpa perlu state global.
 *
 * Query string dipakai (bukan state) supaya tombol "back" di browser tetap
 * menutup modal, dan supaya tautan `?settings=true&tab=profil` bisa dibagikan.
 */
export function settingsModalHref(pathname: string, tab?: string): Route {
  const base = pathname.split('?')[0] || '/dashboard';
  const params = new URLSearchParams({ settings: 'true' });
  if (tab) params.set('tab', tab);
  return `${base}?${params.toString()}` as Route;
}

/** Membuka modal pengaturan dari halaman mana pun. */
export function openSettingsModal(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  tab?: string,
) {
  router.push(settingsModalHref(pathname, tab), { scroll: false });
}