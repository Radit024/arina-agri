import { alpha, type Theme } from '@mui/material/styles';

type PaletteIntent = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

function getPalette(theme: Theme, intent: PaletteIntent) {
  return theme.palette[intent];
}

export function softBg(theme: Theme, intent: PaletteIntent = 'success', opacity = 0.14) {
  const palette = getPalette(theme, intent);
  if (theme.palette.mode === 'dark') {
    return alpha(palette.main, opacity);
  }

  return palette.light ?? alpha(palette.main, opacity);
}

export function softHoverBg(theme: Theme, intent: PaletteIntent = 'success') {
  return theme.palette.mode === 'dark' ? softBg(theme, intent, 0.2) : softBg(theme, intent, 0.72);
}

export function softText(theme: Theme, intent: PaletteIntent = 'success') {
  const palette = getPalette(theme, intent);
  return theme.palette.mode === 'dark' ? palette.main : palette.dark ?? palette.main;
}

export function accentText(theme: Theme, intent: PaletteIntent = 'primary') {
  const palette = getPalette(theme, intent);
  return palette.contrastText ?? (theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.common.white);
}

export function tableHoverBg(theme: Theme) {
  return theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.04) : alpha(theme.palette.common.black, 0.025);
}

export function elevatedShadow(theme: Theme, lightShadow: string, darkAlpha = 0.42) {
  return theme.palette.mode === 'dark' ? `0 8px 28px ${alpha(theme.palette.common.black, darkAlpha)}` : lightShadow;
}
