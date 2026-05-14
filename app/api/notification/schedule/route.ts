import { handleScheduleGet, handleSchedulePost } from '@/lib/server/notifications/scheduleHandlers';

export const dynamic = 'force-dynamic';

export const GET = handleScheduleGet;
export const POST = handleSchedulePost;