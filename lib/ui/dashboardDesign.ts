import type { SxProps, Theme } from '@mui/material/styles';

export const dashboardRadii = {
  action: 8,
  iconTile: 2,
  panel: 3,
  card: 4,
} as const;

export const pageShellSx: SxProps<Theme> = {
  p: { xs: 2, md: 3 },
  minHeight: { md: 'calc(100dvh - 96px)' },
  display: 'flex',
  flexDirection: 'column',
};

export const pageHeaderSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: { xs: 'column', md: 'row' },
  justifyContent: 'space-between',
  alignItems: { xs: 'stretch', md: 'center' },
  gap: 2,
  mb: 2,
};

export const pageHeaderLeadingSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 1.5,
  minWidth: 0,
};

export const pageHeaderIconSx: SxProps<Theme> = {
  width: 44,
  height: 44,
  borderRadius: dashboardRadii.iconTile,
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  color: 'primary.main',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

export const pageHeaderTextSx: SxProps<Theme> = {
  minWidth: 0,
};

export const pageTitleSx: SxProps<Theme> = {
  fontFamily: 'var(--font-sora)',
  fontWeight: 700,
  fontSize: { xs: '1.5rem', md: '2.125rem' },
};

export const pageSubtitleSx: SxProps<Theme> = {
  color: 'text.secondary',
};

export const pageHeaderMetaSx: SxProps<Theme> = {
  mt: 1,
};

export const pageHeaderActionsSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  alignItems: { xs: 'stretch', sm: 'center' },
  justifyContent: { xs: 'stretch', md: 'flex-end' },
  gap: 1,
  flexShrink: 0,
  width: { xs: '100%', md: 'auto' },
};

export const pageActionButtonSx: SxProps<Theme> = {
  borderRadius: dashboardRadii.action,
  minHeight: 44,
  whiteSpace: 'nowrap',
  fontWeight: 600,
  textTransform: 'none',
};

export function mergeSx(...values: Array<SxProps<Theme> | undefined>): SxProps<Theme> {
  return values.flatMap((value) => {
    if (!value) {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }) as SxProps<Theme>;
}
