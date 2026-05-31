'use client';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import type { ApiCalendarEvent } from '@/lib/api';

interface CalendarEventColor {
  bg: string;
  text: string;
  dot: string;
}

interface CalendarDayCellProps {
  dateLabel: string;
  day: number;
  events: ApiCalendarEvent[];
  getEventColor: (jenis: ApiCalendarEvent['jenis']) => CalendarEventColor;
  isToday: boolean;
  moreLabel: string;
  onAdd: () => void;
  onEdit: (event: ApiCalendarEvent) => void;
}

export default function CalendarDayCell({
  dateLabel,
  day,
  events,
  getEventColor,
  isToday,
  moreLabel,
  onAdd,
  onEdit,
}: CalendarDayCellProps) {
  return (
    <Box
      data-testid="calendar-day-cell"
      sx={{
        minHeight: { xs: 44, sm: 64, md: 80 },
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: isToday ? 'primary.main' : 'transparent',
        backgroundColor: isToday ? 'primary.light' : 'transparent',
        transition: 'background-color 140ms ease, border-color 140ms ease',
        touchAction: 'manipulation',
        '&:hover': { backgroundColor: 'action.hover' },
      }}
      onClick={onAdd}
    >
      <Box sx={{ width: '100%', p: 0.75 }}>
        <ButtonBase
          aria-label={`Tambah jadwal ${dateLabel}`}
          onClick={(event) => {
            event.stopPropagation();
            onAdd();
          }}
          sx={{
            alignItems: 'flex-start',
            borderRadius: 1,
            justifyContent: 'flex-start',
            minHeight: 24,
            textAlign: 'left',
            width: '100%',
            '&.Mui-focusVisible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2,
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: isToday ? 'primary.main' : 'text.primary',
              display: 'block',
              fontWeight: isToday ? 700 : 500,
            }}
          >
            {day}
          </Typography>
        </ButtonBase>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
          {events.slice(0, 3).map((event) => {
            const colors = getEventColor(event.jenis);

            return (
              <ButtonBase
                key={event._id}
                aria-label={`Edit jadwal ${event.judul}`}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  onEdit(event);
                }}
                sx={{
                  backgroundColor: colors.bg,
                  borderLeft: '2px solid',
                  borderLeftColor: colors.dot,
                  borderRadius: 1,
                  justifyContent: 'flex-start',
                  minHeight: 24,
                  overflow: 'hidden',
                  px: 0.5,
                  py: 0.25,
                  textAlign: 'left',
                  width: '100%',
                  '&:hover': { filter: 'brightness(0.95)' },
                  '&.Mui-focusVisible': {
                    outline: '2px solid',
                    outlineColor: colors.dot,
                    outlineOffset: 1,
                  },
                }}
              >
                <Typography noWrap variant="caption" sx={{ color: colors.text, fontSize: '0.65rem', fontWeight: 600 }}>
                  {event.judul}
                </Typography>
              </ButtonBase>
            );
          })}

          {events.length > 3 && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem', pl: 0.5 }}>
              +{events.length - 3} {moreLabel}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
