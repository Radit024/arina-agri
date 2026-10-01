import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_FINANCE_CATEGORIES,
  formatCustomFinanceCategoryLabel,
  normalizeFinanceCategoryText,
  resolveFinanceCategory,
  type FinanceCategoryDefinition,
  type FinanceCategoryKind,
} from '@/lib/finance/categories';
import type { FinanceCommand } from '@/lib/server/chat-input/types';

interface FinanceCategoryRow {
  id: string;
  user_id: string | null;
  jenis: FinanceCategoryKind;
  name: string;
  aliases: string[] | null;
  color: string | null;
  is_default: boolean | null;
}

interface ResolvedFinanceCategory {
  categoryId?: string;
  name: string;
}

function isSchemaMissingError(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error);
  return /finance_categories|category_id|kategori_snapshot|schema cache|column/i.test(message);
}

function rowToCategory(row: FinanceCategoryRow): FinanceCategoryDefinition {
  return {
    id: row.id,
    jenis: row.jenis,
    label: row.name,
    aliases: row.aliases ?? [],
    color: row.color ?? undefined,
    source: row.is_default ? 'default' : 'custom',
  };
}

function uniqueCategories(categories: FinanceCategoryDefinition[]) {
  const seen = new Set<string>();
  const result: FinanceCategoryDefinition[] = [];

  for (const category of categories) {
    const key = `${category.jenis}:${normalizeFinanceCategoryText(category.label)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(category);
  }

  return result;
}

function mergeAliases(...groups: string[][]) {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const aliases of groups) {
    for (const alias of aliases) {
      const trimmed = alias.trim();
      const normalized = normalizeFinanceCategoryText(trimmed);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      merged.push(trimmed);
    }
  }

  return merged;
}

export async function listFinanceCategoriesForUser(
  supabase: SupabaseClient,
  userId: string,
  jenis?: FinanceCategoryKind,
): Promise<FinanceCategoryDefinition[]> {
  try {
    const { data, error } = await supabase
      .from('finance_categories')
      .select('id,user_id,jenis,name,aliases,color,is_default')
      .or(`user_id.is.null,user_id.eq.${userId}`);

    if (error) throw new Error(error.message);

    const databaseCategories = ((data ?? []) as FinanceCategoryRow[])
      .map(rowToCategory)
      .filter((category) => !jenis || category.jenis === jenis);

    const defaultCategories = DEFAULT_FINANCE_CATEGORIES.filter((category) => !jenis || category.jenis === jenis);
    return uniqueCategories([...databaseCategories, ...defaultCategories]);
  } catch (error) {
    if (!isSchemaMissingError(error)) throw error;
    return DEFAULT_FINANCE_CATEGORIES.filter((category) => !jenis || category.jenis === jenis);
  }
}

export async function resolveFinanceCategoryForCommand(
  supabase: SupabaseClient,
  userId: string,
  command: FinanceCommand,
): Promise<ResolvedFinanceCategory> {
  const categories = await listFinanceCategoriesForUser(supabase, userId, command.jenis);
  const matched = resolveFinanceCategory({
    jenis: command.jenis,
    kategori: command.kategori,
    keterangan: command.keterangan,
    categories,
  });

  if (!matched) {
    return { name: formatCustomFinanceCategoryLabel(command.kategori) };
  }

  return {
    categoryId: matched.id?.startsWith('default-') ? undefined : matched.id,
    name: matched.label,
  };
}

export async function createFinanceCategory(
  supabase: SupabaseClient,
  userId: string,
  input: {
    jenis: FinanceCategoryKind;
    name: string;
    aliases: string[];
  },
) {
  const name = formatCustomFinanceCategoryLabel(input.name);
  const aliases = mergeAliases([name], input.aliases);

  const { data, error } = await supabase
    .from('finance_categories')
    .insert({
      user_id: userId,
      jenis: input.jenis,
      name,
      aliases,
      is_default: false,
    })
    .select('id,user_id,jenis,name,aliases,color,is_default')
    .single();

  if (error) {
    if (isSchemaMissingError(error)) {
      throw new Error('Tabel finance_categories belum tersedia. Periksa migrasi di supabase/migrations/ sebelum memakai modul ini.');
    }
    throw new Error(error.message);
  }

  return rowToCategory(data as FinanceCategoryRow);
}

export async function addFinanceCategoryAliases(
  supabase: SupabaseClient,
  userId: string,
  input: {
    jenis: FinanceCategoryKind;
    name: string;
    aliases: string[];
  },
) {
  const categories = await listFinanceCategoriesForUser(supabase, userId, input.jenis);
  const targetName = normalizeFinanceCategoryText(input.name);
  const existing = categories.find((category) => normalizeFinanceCategoryText(category.label) === targetName);

  if (!existing) {
    throw new Error(`Kategori ${input.name} belum ada. Tambahkan dengan /kategori_tambah terlebih dahulu.`);
  }

  const aliases = mergeAliases(existing.aliases, input.aliases);
  const payload = {
    user_id: existing.id?.startsWith('default-') ? userId : undefined,
    jenis: input.jenis,
    name: existing.label,
    aliases,
    color: existing.color,
    is_default: false,
  };

  const query = existing.id?.startsWith('default-')
    ? supabase
        .from('finance_categories')
        .insert(payload)
        .select('id,user_id,jenis,name,aliases,color,is_default')
        .single()
    : supabase
        .from('finance_categories')
        .update({ aliases, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('id,user_id,jenis,name,aliases,color,is_default')
        .single();

  const { data, error } = await query;
  if (error) {
    if (isSchemaMissingError(error)) {
      throw new Error('Tabel finance_categories belum tersedia. Periksa migrasi di supabase/migrations/ sebelum memakai modul ini.');
    }
    throw new Error(error.message);
  }

  return rowToCategory(data as FinanceCategoryRow);
}

export function formatFinanceCategoryList(categories: FinanceCategoryDefinition[], jenis?: FinanceCategoryKind) {
  const filtered = categories.filter((category) => !jenis || category.jenis === jenis);
  const title = jenis === 'pendapatan'
    ? 'Kategori pemasukan:'
    : jenis === 'pengeluaran'
      ? 'Kategori pengeluaran:'
      : 'Kategori keuangan:';

  if (filtered.length === 0) {
    return `${title}\nBelum ada kategori.`;
  }

  return [
    title,
    ...filtered.map((category) => {
      const aliases = category.aliases.length > 0 ? ` alias: ${category.aliases.join(', ')}` : '';
      return `- ${category.label}${aliases}`;
    }),
  ].join('\n');
}
