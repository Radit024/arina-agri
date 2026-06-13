import Button from '@mui/material/Button';
import type { ButtonProps } from '@mui/material/Button';

import { mergeSx, pageActionButtonSx } from '@/lib/ui/dashboardDesign';

export type PageActionButtonProps = ButtonProps;

export function PageActionButton({ sx, ...props }: PageActionButtonProps) {
  return <Button {...props} sx={mergeSx(pageActionButtonSx, sx)} />;
}
