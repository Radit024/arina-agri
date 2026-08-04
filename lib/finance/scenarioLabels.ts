import type { ScenarioMode } from './rabTypes';

/**
 * Human-readable labels for each scenario mode.
 * Single source of truth - imported by toolbar, controllers, and export helpers.
 */
export const MODE_LABELS: Record<ScenarioMode, string> = {
  PROJECTION: 'Proyeksi',
  REALIZATION: 'Realisasi',
};

/**
 * URL/filename-safe slug for each mode, used in downloaded file names.
 * e.g. laporan-keuangan-padi-proyeksi.xlsx
 */
export const MODE_SLUGS: Record<ScenarioMode, string> = {
  PROJECTION: 'proyeksi',
  REALIZATION: 'realisasi',
};

export function getModeLabel(mode: ScenarioMode): string {
  return MODE_LABELS[mode];
}

export function getModeSlug(mode: ScenarioMode): string {
  return MODE_SLUGS[mode];
}
