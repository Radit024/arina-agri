/**
 * Barrel publik untuk lapisan akses data.
 *
 * Semua modul luar mengimpor dari `@/lib/api` supaya path-nya stabil.
 * Implementasinya dipisah per domain supaya tidak ada satu berkas yang
 * memegang seluruh API:
 *
 * - `./types`              bentuk frontend (camelCase, null sudah ternormalkan)
 * - `./mappers`            baris Postgres menjadi bentuk frontend
 * - `./client`             helper fetch dan header autentikasi
 * - `./transactions` `./projects` `./rab` `./stok` `./calendar`
 * - `./profile` `./ai` `./notifications` `./weather`
 */

export type * from './types';

export { transactionApi, transactionCategoryApi, transactionSatuanApi } from './transactions';
export {
  financeProjectApi,
  financeScenarioApi,
  financingAssumptionsApi,
  productionSalesAssumptionsApi,
  migrationApi,
} from './projects';
export { rabApi } from './rab';
export { stokApi, buyersApi, gradesApi, locationsApi } from './stok';
export { eventApi } from './calendar';
export { profileApi } from './profile';
export { aiApi } from './ai';
export { notificationApi, notificationScheduleApi } from './notifications';
export { weatherApi, locationApi } from './weather';
