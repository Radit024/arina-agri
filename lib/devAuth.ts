export const DEVELOPMENT_USER_ID = '00000000-0000-4000-8000-000000000001';
export const DEVELOPMENT_ACCESS_TOKEN = 'mock-token';

export const ARINA_USER_ID_STORAGE_KEY = 'arina_user_id';
export const DEVELOPMENT_AUTH_MODE_STORAGE_KEY = 'arina_auth_mode';
export const DEVELOPMENT_AUTH_MODE_LOCAL = 'local';
export const DEVELOPMENT_LOCAL_USER_ID_STORAGE_KEY = 'arina_local_user_id';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getBrowserStorage() {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

function createUuid() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function buildDevelopmentAccessToken(userId: string) {
  return `${DEVELOPMENT_ACCESS_TOKEN}:${userId}`;
}

export function parseDevelopmentAccessToken(token: string) {
  const prefix = `${DEVELOPMENT_ACCESS_TOKEN}:`;
  if (!token.startsWith(prefix)) return null;

  const userId = token.slice(prefix.length).trim();
  return isUuid(userId) ? userId : null;
}

export function readLocalDevelopmentUserId(storage: Storage | null = getBrowserStorage()) {
  if (!storage) return null;
  if (storage.getItem(DEVELOPMENT_AUTH_MODE_STORAGE_KEY) !== DEVELOPMENT_AUTH_MODE_LOCAL) return null;

  const localUserId = storage.getItem(DEVELOPMENT_LOCAL_USER_ID_STORAGE_KEY);
  return isUuid(localUserId) ? localUserId : null;
}

export function activateLocalDevelopmentAuth(storage: Storage | null = getBrowserStorage()) {
  if (!storage) return null;

  const existingUserId = storage.getItem(DEVELOPMENT_LOCAL_USER_ID_STORAGE_KEY);
  const localUserId = isUuid(existingUserId) ? existingUserId : createUuid();

  storage.setItem(DEVELOPMENT_AUTH_MODE_STORAGE_KEY, DEVELOPMENT_AUTH_MODE_LOCAL);
  storage.setItem(DEVELOPMENT_LOCAL_USER_ID_STORAGE_KEY, localUserId);
  storage.setItem(ARINA_USER_ID_STORAGE_KEY, localUserId);

  return localUserId;
}

export function clearLocalDevelopmentAuth(storage: Storage | null = getBrowserStorage()) {
  if (!storage) return;

  storage.removeItem(DEVELOPMENT_AUTH_MODE_STORAGE_KEY);
  storage.removeItem(ARINA_USER_ID_STORAGE_KEY);
}

export function clearDevelopmentAuthMode(storage: Storage | null = getBrowserStorage()) {
  if (!storage) return;
  storage.removeItem(DEVELOPMENT_AUTH_MODE_STORAGE_KEY);
}

