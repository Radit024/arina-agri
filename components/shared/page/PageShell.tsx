import Box from '@mui/material/Box';
import type { BoxProps } from '@mui/material/Box';

import { mergeSx, pageShellSx } from '@/lib/ui/dashboardDesign';

export type PageShellProps = BoxProps;

export function PageShell({ sx, ...props }: PageShellProps) {
  return <Box {...props} sx={mergeSx(pageShellSx, sx)} />;
}
