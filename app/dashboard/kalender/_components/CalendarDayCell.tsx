'use client';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import type { ApiCalendarEvent } from '@/lib/api';
import { softBg, softText } from '@/lib/themeColors';

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
      sx={(theme) => ({
        minHeight: { xs: 58, sm: 72, md: 92 },
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: isToday ? 'primary.main' : 'transparent',
        backgroundColor: isToday ? softBg(theme, 'primary', 0.14) : 'transparent',
        transition: 'background-color 140ms ease, border-color 140ms ease',
        touchAction: 'manipulation',
        '&:hover': { backgroundColor: 'action.hover' },
      })}
      onClick={onAdd}
    >
      <Box sx={{ width: '100%', p: { xs: 0.8, sm: 1 } }}>
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
            minHeight: { xs: 28, sm: 30 },
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
            variant="body2"
            sx={{
              color: (theme) => isToday ? softText(theme, 'primary') : theme.palette.text.primary,
              display: 'block',
              fontFamily: 'var(--font-sora)',
              fontSize: { xs: '1rem', sm: '1.05rem', md: '1.125rem' },
              fontWeight: isToday ? 700 : 500,
              lineHeight: 1.15,
            }}
          >
            {day}
          </Typography>
        </ButtonBase>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35, mt: { xs: 0.45, sm: 0.6 } }}>
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
                  minHeight: { xs: 26, sm: 28 },
                  overflow: 'hidden',
                  px: { xs: 0.55, sm: 0.7 },
                  py: 0.3,
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
                <Typography noWrap variant="caption" sx={{ color: colors.text, fontSize: { xs: '0.68rem', sm: '0.72rem' }, fontWeight: 650 }}>
                  {event.judul}
                </Typography>
              </ButtonBase>
            );
          })}

          {events.length > 3 && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: { xs: '0.66rem', sm: '0.7rem' }, pl: 0.5 }}>
              +{events.length - 3} {moreLabel}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
