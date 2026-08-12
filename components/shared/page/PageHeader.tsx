import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

import {
  mergeSx,
  pageHeaderActionsSx,
  pageHeaderIconSx,
  pageHeaderLeadingSx,
  pageHeaderMetaSx,
  pageHeaderSx,
  pageHeaderTextSx,
  pageSubtitleSx,
  pageTitleSx,
} from '@/lib/ui/dashboardDesign';

// Konvensi: judul halaman TIDAK memakai ikon (lihat panduan-perbaikan-arina.md #1.4). Prop `icon` di bawah
// dipertahankan untuk kasus non-judul (mis. status/meta), bukan untuk dekorasi judul.
export interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  actionsLabel?: string;
  sx?: SxProps<Theme>;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  meta,
  actions,
  actionsLabel,
  sx,
}: PageHeaderProps) {
  return (
    <Box component="header" sx={mergeSx(pageHeaderSx, { display: { xs: 'none', md: 'flex' } }, sx)}>
      <Box sx={pageHeaderLeadingSx}>
        {icon ? <Box sx={pageHeaderIconSx}>{icon}</Box> : null}
        <Box sx={pageHeaderTextSx}>
          <Typography component="h1" variant="h5" sx={pageTitleSx}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" sx={pageSubtitleSx}>
              {subtitle}
            </Typography>
          ) : null}
          {meta ? <Box sx={pageHeaderMetaSx}>{meta}</Box> : null}
        </Box>
      </Box>

      {actions ? (
        <Box role="group" aria-label={actionsLabel ?? `Aksi halaman ${title}`} sx={pageHeaderActionsSx}>
          {actions}
        </Box>
      ) : null}
    </Box>
  );
}
