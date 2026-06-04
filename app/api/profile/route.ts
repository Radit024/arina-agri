import { handleProfileGet, handleProfilePatch } from '@/lib/server/profile/profileHandlers';

export const dynamic = 'force-dynamic';

export const GET = handleProfileGet;
export const PATCH = handleProfilePatch;
