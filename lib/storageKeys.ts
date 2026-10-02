/**
 * Kunci localStorage yang dipakai lebih dari satu controller.
 *
 * Kunci dikualifikasi per pengguna (`-<userId>`) sehingga dua akun di browser
 * yang sama tidak saling menimpa kontak notifikasi.
 *
 * Penting: prefix di sini adalah kontrak antara fitur. Notifikasi cuaca
 * membacanya lewat {@link useWeatherContacts}, Pengaturan menulisnya lewat
 * {@link useSettingsModalController}. Kalau prefix diubah di satu sisi saja,
 * Kontakcuaca akan membaca key lama yang tidak pernah ditulis ulang — gejalanya
 * nomor tujuan notifikasi tiba-tiba kosong tanpa error.
 */

export const WEATHER_WHATSAPP_PHONE_KEY = 'arina-weather-whatsapp-phone';
export const WEATHER_TELEGRAM_CONTACT_KEY = 'arina-weather-telegram-contact';

/** Kunci proyek keuangan yang terpilih, dibaca hook dan controller. */
export const SELECTED_FINANCE_PROJECT_KEY = 'arina-selected-finance-project';

/**
 * Menggabungkan prefix dengan id pengguna. Tanpa session, data ditulis di bawah
 * satu slot `guest` supaya tidak menabrak akun lain di browser yang sama.
 */
export function scopedStorageKey(prefix: string, userId?: string | null): string {
  return `${prefix}-${userId || 'guest'}`;
}
