'use client';

import { useTranslations } from 'next-intl';

import StatusBadge, { type StatusIntent } from '@/components/ui/StatusBadge';
import type { ApiHarvestBatch } from '@/lib/api';

export type StockTranslator = ReturnType<typeof useTranslations>;

const StatusChip = ({ status, t }: { status: ApiHarvestBatch['status']; t: StockTranslator }) => {
  const map: Record<ApiHarvestBatch['status'], { label: string; intent: StatusIntent }> = {
    aman: { label: t('status.safe'), intent: 'success' },
    menipis: { label: t('status.low'), intent: 'warning' },
    hampir_kadaluarsa: { label: t('status.expiring'), intent: 'error' },
    habis: { label: t('status.empty'), intent: 'neutral' },
  };
  const s = map[status] ?? { label: status, intent: 'neutral' };
  return (
    <StatusBadge
      label={s.label}
      intent={s.intent}
    />
  );
};

// Grade badge (free-form strings)
const GRADE_PALETTE: StatusIntent[] = ['success', 'info', 'warning', 'error', 'primary'];

function gradeColorIndex(grade: string): number {
  let hash = 0;
  for (let i = 0; i < grade.length; i++) hash += grade.charCodeAt(i);
  return hash % GRADE_PALETTE.length;
}

const GradeChip = ({ grade, t }: { grade: string; t: StockTranslator }) => {
  const intent = GRADE_PALETTE[gradeColorIndex(grade)];
  return (
    <StatusBadge
      label={`${t('table.grade')} ${grade}`}
      intent={intent}
    />
  );
};

export { GradeChip, StatusChip };
