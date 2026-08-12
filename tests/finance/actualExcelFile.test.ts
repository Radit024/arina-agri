import path from 'node:path';
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { parseRabWorkbook } from '@/lib/finance/rabExcel';
import { buildIncomeStatementWorksheetData } from '@/lib/finance/incomeStatementWorksheet';
import { DEFAULT_FINANCE_CATEGORIES, resolveFinanceCategory } from '@/lib/finance/categories';

describe('Strict Verification Against Actual Case Study File (CATATAN KEUANGAN PADI 1 Ha ADE.xlsx)', () => {
  it('parses actual Excel file and verifies all financial figures, warnings, and categorizations', async () => {
    const filePath = path.resolve(process.cwd(), 'references/CATATAN KEUANGAN PADI 1 Ha ADE.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const parsed = parseRabWorkbook(workbook);
    const incomeStatementData = buildIncomeStatementWorksheetData({
      transactions: parsed.transactions.map((tx, idx) => ({
        id: `tx-${idx}`,
        jenis: tx.jenis,
        kategori: tx.kategori || 'Lainnya',
        nominal: tx.nominal,
        tanggal: tx.tanggal,
        keterangan: tx.keterangan,
      })),
      rabItems: parsed.items,
    });

    console.log('=== ACTUAL EXCEL FILE PARSING LOGS ===');
    console.log('Project Name:', parsed.project.name);
    console.log('Parsed Items Count:', parsed.items.length);
    console.log('Parsed Ledger Transactions Count:', parsed.transactions.length);
    console.log('Total Pendapatan:', incomeStatementData.totalPendapatan);
    console.log('Total Pengeluaran:', incomeStatementData.totalPengeluaran);
    console.log('Total Laba/Rugi:', incomeStatementData.labaRugi);

    console.log('--- RAB ITEMS MATCHING DIAGNOSTICS ---');
    for (const item of parsed.items) {
      const matches = parsed.transactions.filter((tx) => tx.keterangan === item.name);
      console.log(`RAB Item "${item.name}" (plannedTotal: ${item.plannedTotal}) -> matched transactions in ledger: ${matches.length}`);
    }
    console.log('Warnings Count:', parsed.warnings.length);
    console.log('Warnings:', parsed.warnings);

    // Assert 1: Total Pengeluaran MUST exactly equal 22159000
    expect(incomeStatementData.totalPengeluaran).toBe(22_159_000);

    // Assert 2: Total Laba/Rugi MUST exactly equal 23341000
    expect(incomeStatementData.labaRugi).toBe(23_341_000);

    // Assert 3: The warnings array MUST contain the mismatch warning for "Sewa lahan"
    const sewaLahanWarning = parsed.warnings.find((w) =>
      /sewa lahan/i.test(w.description) && /berbeda dengan hasil perkalian/i.test(w.message),
    );
    expect(sewaLahanWarning).toBeDefined();
    console.log('Verified Sewa Lahan Warning:', sewaLahanWarning);

    // Assert 4: "Pembelian dolomit" MUST be categorized under SAPRODI
    const dolomitTx = parsed.transactions.find((tx) => /dolomit/i.test(tx.keterangan));
    expect(dolomitTx).toBeDefined();
    const resolvedDolomitCategory = resolveFinanceCategory({
      jenis: 'pengeluaran',
      kategori: dolomitTx?.kategori || '',
      keterangan: dolomitTx?.keterangan,
      categories: DEFAULT_FINANCE_CATEGORIES,
    });
    console.log('Resolved Dolomit Category:', resolvedDolomitCategory?.label);
    expect(resolvedDolomitCategory?.label).toBe('SAPRODI');

    // Assert 5: "Pembayaran upah penyulaman tanaman" MUST be categorized under TENAGA KERJA
    const penyulamanTx = parsed.transactions.find((tx) => /penyulaman/i.test(tx.keterangan));
    expect(penyulamanTx).toBeDefined();
    const resolvedPenyulamanCategory = resolveFinanceCategory({
      jenis: 'pengeluaran',
      kategori: penyulamanTx?.kategori || '',
      keterangan: penyulamanTx?.keterangan,
      categories: DEFAULT_FINANCE_CATEGORIES,
    });
    console.log('Resolved Penyulaman Category:', resolvedPenyulamanCategory?.label);
    expect(resolvedPenyulamanCategory?.label).toBe('TENAGA KERJA');
  });
});
