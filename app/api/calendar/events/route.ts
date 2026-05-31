import {
  handleCalendarEventsDelete,
  handleCalendarEventsGet,
  handleCalendarEventsPatch,
  handleCalendarEventsPost,
} from '@/lib/server/calendar/events';

export const dynamic = 'force-dynamic';

export const GET = handleCalendarEventsGet;
export const POST = handleCalendarEventsPost;
export const PATCH = handleCalendarEventsPatch;
export const DELETE = handleCalendarEventsDelete;
