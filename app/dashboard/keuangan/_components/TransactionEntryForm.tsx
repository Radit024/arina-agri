import type { TransactionDraft, DraftErrors } from '@/controllers/keuangan/useTransactionBatchController';
import TransactionFormFields from './TransactionFormFields';

interface Props {
  draft: TransactionDraft;
  kategoriList: string[];
  satuanList: string[];
  errors: DraftErrors;
  onFieldChange: (field: keyof TransactionDraft, value: string) => void;
  onOpenKategoriDialog: () => void;
  onOpenSatuanDialog: () => void;
  rabSuggestion: string | null;
}

export default function TransactionEntryForm({
  draft,
  kategoriList,
  satuanList,
  errors,
  onFieldChange,
  onOpenKategoriDialog,
  onOpenSatuanDialog,
  rabSuggestion,
}: Props) {
  return (
    <TransactionFormFields
      draft={draft}
      kategoriList={kategoriList}
      satuanList={satuanList}
      errors={errors}
      onFieldChange={onFieldChange}
      onOpenKategoriDialog={onOpenKategoriDialog}
      onOpenSatuanDialog={onOpenSatuanDialog}
      rabSuggestion={rabSuggestion}
      showRabSuggestionAction
      idPrefix={draft.id}
    />
  );
}
