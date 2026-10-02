// Akses data domain: projects.

import { supabase } from '@/lib/supabase';
import type {
  DbFinanceProject,
  DbFinanceScenario,
  DbFinancingAssumptions,
  DbProductionSalesAssumptions,
  DbTransaction,
} from '@/lib/supabase';
import type {
  FinancingAssumptions,
  ProductionSalesAssumptions,
} from '@/lib/finance/rabTypes';
import type {
  ApiTransaction,
  ApiFinanceScenario,
  ApiFinancingAssumptions,
  ApiProductionSalesAssumptions,
  ApiFinanceProject,
} from './types';
import { resolveCurrentUser } from './client';
import { mapTx, mapFinanceScenario, mapFinancingAssumptions, mapProductionSalesAssumptions, mapFinanceProject } from './mappers';

export const financeProjectApi = {
  getAll: async (): Promise<ApiFinanceProject[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('finance_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapFinanceProject(row as DbFinanceProject));
  },

  create: async (payload: Omit<ApiFinanceProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiFinanceProject> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('finance_projects')
      .insert({
        user_id: user.id,
        name: payload.name,
        commodity: payload.commodity,
        land_area: payload.landArea,
        land_area_unit: payload.landAreaUnit,
        season_label: payload.seasonLabel,
        start_date: payload.startDate,
        end_date: payload.endDate,
        status: payload.status,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapFinanceProject(data as DbFinanceProject);
  },

  update: async (id: string, payload: Partial<ApiFinanceProject>): Promise<ApiFinanceProject> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.name !== undefined) update.name = payload.name;
    if (payload.commodity !== undefined) update.commodity = payload.commodity;
    if (payload.landArea !== undefined) update.land_area = payload.landArea;
    if (payload.landAreaUnit !== undefined) update.land_area_unit = payload.landAreaUnit;
    if (payload.seasonLabel !== undefined) update.season_label = payload.seasonLabel;
    if (payload.startDate !== undefined) update.start_date = payload.startDate;
    if (payload.endDate !== undefined) update.end_date = payload.endDate;
    if (payload.status !== undefined) update.status = payload.status;

    const { data, error } = await supabase
      .from('finance_projects')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapFinanceProject(data as DbFinanceProject);
  },

  delete: async (id: string): Promise<null> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { error } = await supabase.from('finance_projects').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return null;
  },
};


export const financeScenarioApi = {
  getOrCreateForProject: async (projectId: string): Promise<ApiFinanceScenario[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];

    // Fetch existing scenarios for this project
    const { data: existing, error: fetchError } = await supabase
      .from('finance_scenarios')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id);
    if (fetchError) throw new Error(fetchError.message);

    const existingModes = new Set((existing ?? []).map((row) => (row as DbFinanceScenario).mode));
    const modesToCreate: Array<'PROJECTION' | 'REALIZATION'> = (['PROJECTION', 'REALIZATION'] as const).filter(
      (mode) => !existingModes.has(mode),
    );

    if (modesToCreate.length > 0) {
      const inserts = modesToCreate.map((mode) => ({
        user_id: user.id,
        project_id: projectId,
        mode,
      }));
      const { error: insertError } = await supabase.from('finance_scenarios').insert(inserts);
      if (insertError) throw new Error(insertError.message);

      // Re-fetch after insert
      const { data: refreshed, error: refreshError } = await supabase
        .from('finance_scenarios')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id);
      if (refreshError) throw new Error(refreshError.message);
      return (refreshed ?? []).map((row) => mapFinanceScenario(row as DbFinanceScenario));
    }

    return (existing ?? []).map((row) => mapFinanceScenario(row as DbFinanceScenario));
  },
};

// ─── Financing Assumptions API ─────────────────────────────────────

export const financingAssumptionsApi = {
  getByScenario: async (scenarioId: string): Promise<ApiFinancingAssumptions | null> => {
    if (scenarioId.startsWith('guest-')) return null;
    const user = await resolveCurrentUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('financing_assumptions')
      .select('*')
      .eq('scenario_id', scenarioId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapFinancingAssumptions(data as DbFinancingAssumptions) : null;
  },

  upsert: async (
    scenarioId: string,
    payload: Omit<FinancingAssumptions, 'id' | 'scenarioId'>,
  ): Promise<ApiFinancingAssumptions> => {
    if (scenarioId.startsWith('guest-')) throw new Error('Fitur asumsi tidak tersedia di mode tamu');
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('financing_assumptions')
      .upsert(
        {
          scenario_id: scenarioId,
          saldo_kas_awal: payload.saldoKasAwal,
          modal_sendiri: payload.modalSendiri,
          nilai_pinjaman: payload.nilaiPinjaman,
          bunga_per_periode: payload.bungaPerPeriode,
          tanggal_pencairan: payload.tanggalPencairan || null,
          tanggal_pembayaran: payload.tanggalPembayaran || null,
          biaya_lain: payload.biayaLain,
        },
        { onConflict: 'scenario_id' },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapFinancingAssumptions(data as DbFinancingAssumptions);
  },
};


export const productionSalesAssumptionsApi = {
  getByScenario: async (scenarioId: string): Promise<ApiProductionSalesAssumptions | null> => {
    if (scenarioId.startsWith('guest-')) return null;
    const user = await resolveCurrentUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('production_sales_assumptions')
      .select('*')
      .eq('scenario_id', scenarioId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapProductionSalesAssumptions(data as DbProductionSalesAssumptions) : null;
  },

  upsert: async (
    scenarioId: string,
    payload: Omit<ProductionSalesAssumptions, 'id' | 'scenarioId'>,
  ): Promise<ApiProductionSalesAssumptions> => {
    if (scenarioId.startsWith('guest-')) throw new Error('Fitur asumsi tidak tersedia di mode tamu');
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('production_sales_assumptions')
      .upsert(
        {
          scenario_id: scenarioId,
          produksi: payload.produksi,
          satuan: payload.satuan || 'kg',
          harga_jual: payload.hargaJual,
        },
        { onConflict: 'scenario_id' },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapProductionSalesAssumptions(data as DbProductionSalesAssumptions);
  },
};


export const migrationApi = {
  autoMigrateLegacyRab: async (projectId: string, projectionScenarioId: string): Promise<number> => {
    const user = await resolveCurrentUser();
    if (!user) return 0;

    const { data: categoriesData, error: catError } = await supabase
      .from('rab_categories')
      .select('id')
      .eq('project_id', projectId)
      .is('scenario_id', null);
    if (catError) throw new Error(catError.message);

    const { data: itemsData, error: itemError } = await supabase
      .from('rab_items')
      .select('id')
      .eq('project_id', projectId)
      .is('scenario_id', null);
    if (itemError) throw new Error(itemError.message);

    const categories = (categoriesData ?? []) as Array<{ id: string }>;
    const items = (itemsData ?? []) as Array<{ id: string }>;

    if (categories.length === 0 && items.length === 0) {
      return 0;
    }

    let updatedCount = 0;

    if (categories.length > 0) {
      const catIds = categories.map((c) => c.id);
      const { error: updCatError } = await supabase
        .from('rab_categories')
        .update({ scenario_id: projectionScenarioId })
        .in('id', catIds);
      if (updCatError) throw new Error(updCatError.message);
      updatedCount += categories.length;

      const catLogs = categories.map((c) => ({
        user_id: user.id,
        project_id: projectId,
        entity_type: 'rab_category' as const,
        entity_id: c.id,
        previous_scenario_id: null,
        new_scenario_id: projectionScenarioId,
        action: 'auto_migrate_rab' as const,
      }));
      await supabase.from('migration_audit_log').insert(catLogs);
    }

    if (items.length > 0) {
      const itemIds = items.map((i) => i.id);
      const { error: updItemError } = await supabase
        .from('rab_items')
        .update({ scenario_id: projectionScenarioId })
        .in('id', itemIds);
      if (updItemError) throw new Error(updItemError.message);
      updatedCount += items.length;

      const itemLogs = items.map((i) => ({
        user_id: user.id,
        project_id: projectId,
        entity_type: 'rab_item' as const,
        entity_id: i.id,
        previous_scenario_id: null,
        new_scenario_id: projectionScenarioId,
        action: 'auto_migrate_rab' as const,
      }));
      await supabase.from('migration_audit_log').insert(itemLogs);
    }

    return updatedCount;
  },

  getUnclassifiedTransactions: async (projectId: string): Promise<ApiTransaction[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('project_id', projectId)
      .is('scenario_id', null)
      .order('tanggal', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((t) => mapTx(t as DbTransaction));
  },

  classifyTransactions: async (
    projectId: string,
    transactionIds: string[],
    targetScenarioId: string,
  ): Promise<{ successCount: number; failCount: number }> => {
    const user = await resolveCurrentUser();
    if (!user || transactionIds.length === 0) return { successCount: 0, failCount: 0 };

    let successCount = 0;
    let failCount = 0;

    for (const txId of transactionIds) {
      try {
        const { error } = await supabase
          .from('transactions')
          .update({ scenario_id: targetScenarioId })
          .eq('id', txId);
        if (error) throw new Error(error.message);

        await supabase.from('migration_audit_log').insert({
          user_id: user.id,
          project_id: projectId,
          entity_type: 'transaction',
          entity_id: txId,
          previous_scenario_id: null,
          new_scenario_id: targetScenarioId,
          action: 'classify_transaction',
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    return { successCount, failCount };
  },

  unclassifyTransaction: async (
    projectId: string,
    transactionId: string,
    currentScenarioId: string,
  ): Promise<void> => {
    const user = await resolveCurrentUser();
    if (!user) return;
    const { error } = await supabase
      .from('transactions')
      .update({ scenario_id: null })
      .eq('id', transactionId);
    if (error) throw new Error(error.message);

    await supabase.from('migration_audit_log').insert({
      user_id: user.id,
      project_id: projectId,
      entity_type: 'transaction',
      entity_id: transactionId,
      previous_scenario_id: currentScenarioId,
      new_scenario_id: null,
      action: 'rollback_classification',
    });
  },
};