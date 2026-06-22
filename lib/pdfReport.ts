/**
 * Laporan Keuangan PDF Generator untuk Arina Agri.
 * Menggunakan jsPDF + jspdf-autotable.
 */

import { formatDateLong, formatMonthYear } from '@/lib/formatters';
import type {
  CashFlowComparison,
  FinanceProject,
  FinanceTransactionForReport,
  IncomeStatementComparison,
  RabItem,
} from '@/lib/finance/rabTypes';

const BULAN_LABELS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function getPeriodeLabel(bulanKey: string): string {
  if (bulanKey === 'semua') return 'Semua Periode';
  const [tahun, bulan] = bulanKey.split('-');
  const idx = Number(bulan) - 1;
  if (idx < 0 || idx > 11) return bulanKey;
  return `${BULAN_LABELS[idx]} ${tahun}`;
}

export interface ReportData {
  periode: string;
  periodeLabel: string;
  totalPendapatan: number;
  totalPengeluaran: number;
  labaBersih: number;
  project?: FinanceProject | null;
  rabItems?: RabItem[];
  transactions: FinanceTransactionForReport[];
  incomeStatementComparison?: IncomeStatementComparison;
  cashFlowComparison?: CashFlowComparison;
  userName?: string;
  aiAnalysis?: string;
}

type PdfTableColumnStyle = {
  cellWidth?: number | 'auto' | 'wrap';
  halign?: 'left' | 'center' | 'right';
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
};

export interface PdfReportTable {
  title: string;
  head: string[][];
  body: string[][];
  columnStyles?: Record<number, PdfTableColumnStyle>;
}

interface JsPdfWithAutoTable {
  lastAutoTable?: {
    finalY?: number;
  };
}

interface JsPdfWithPageCount {
  internal: {
    getNumberOfPages: () => number;
  };
}

function formatReportRp(value: number) {
  return `Rp ${Math.abs(value).toLocaleString('id-ID')}`;
}

function formatSignedReportRp(value: number) {
  if (value === 0) return 'Rp 0';
  return `${value > 0 ? '+ ' : '- '}${formatReportRp(value)}`;
}

function formatReportPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '-';
  return `${(value * 100).toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    belum_ada_realisasi: 'Belum ada realisasi',
    sesuai_rencana: 'Sesuai rencana',
    hemat: 'Hemat',
    over_budget: 'Over budget',
    di_atas_target: 'Di atas target',
    di_bawah_target: 'Di bawah target',
  };
  return labels[status] ?? status;
}

export function buildPdfReportTables(data: ReportData): PdfReportTable[] {
  const tables: PdfReportTable[] = [];
  const incomeStatement = data.incomeStatementComparison;
  const cashFlow = data.cashFlowComparison;
  const rabItems = data.rabItems ?? [];
  const sortedTransactions = [...data.transactions].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  tables.push({
    title: 'RENCANA ANGGARAN BIAYA (RAB)',
    head: [['Jenis', 'Kategori', 'Item', 'Volume', 'Satuan', 'Harga Satuan', 'Total Rencana', 'Bulan Kas']],
    body: rabItems.length > 0
      ? rabItems.map((item) => [
          item.type === 'income' ? 'Pendapatan' : 'Pengeluaran',
          item.categoryName ?? item.categoryId,
          item.name,
          String(item.volume),
          item.unit,
          formatReportRp(item.unitPrice),
          formatReportRp(item.plannedTotal),
          item.plannedCashMonth ? formatMonthYear(item.plannedCashMonth) : '-',
        ])
      : [['Belum ada item RAB', '', '', '', '', '', '', '']],
    columnStyles: {
      3: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
  });

  tables.push({
    title: 'CATATAN TRANSAKSI HARIAN',
    head: [['Tanggal', 'Uraian Transaksi', 'Volume', 'Satuan', 'Harga Satuan', 'Pengeluaran', 'Pemasukan', 'Item RAB']],
    body: sortedTransactions.length > 0
      ? sortedTransactions.map((tx) => [
          formatDateLong(tx.tanggal),
          tx.keterangan || tx.kategori,
          tx.volume == null ? '' : String(tx.volume),
          tx.satuan ?? '',
          tx.hargaSatuan == null ? '' : formatReportRp(tx.hargaSatuan),
          tx.jenis === 'pengeluaran' ? formatReportRp(tx.nominal) : '-',
          tx.jenis === 'pendapatan' ? formatReportRp(tx.nominal) : '-',
          tx.rabItemId ?? '-',
        ])
      : [['Belum ada transaksi harian', '', '', '', '', '', '', '']],
    columnStyles: {
      2: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
  });

  if (incomeStatement) {
    tables.push({
      title: 'LAPORAN LABA RUGI',
      head: [['Kategori', 'Item', 'Jenis', 'Rencana', 'Aktual', 'Selisih', '% Selisih', 'Status']],
      body: incomeStatement.rows.length > 0
        ? incomeStatement.rows.map((row) => [
            row.categoryName,
            row.itemName,
            row.type === 'income' ? 'Pendapatan' : 'Pengeluaran',
            formatReportRp(row.planned),
            formatReportRp(row.actual),
            formatSignedReportRp(row.variance),
            formatReportPercent(row.variancePercent),
            statusLabel(row.status),
          ])
        : [['Belum ada data laba rugi', '', '', '', '', '', '', '']],
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
    });
  }

  if (cashFlow) {
    tables.push({
      title: 'ARUS KAS',
      head: [['Bulan', 'Kas Masuk Rencana', 'Kas Masuk Aktual', 'Kas Keluar Rencana', 'Kas Keluar Aktual', 'Bersih Rencana', 'Bersih Aktual', 'Selisih']],
      body: cashFlow.rows.length > 0
        ? cashFlow.rows.map((row) => [
            formatMonthYear(row.month),
            formatReportRp(row.plannedInflow),
            formatReportRp(row.actualInflow),
            formatReportRp(row.plannedOutflow),
            formatReportRp(row.actualOutflow),
            formatSignedReportRp(row.plannedNet),
            formatSignedReportRp(row.actualNet),
            formatSignedReportRp(row.variance),
          ])
        : [['Belum ada data arus kas', '', '', '', '', '', '', '']],
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
      },
    });
  }

  if (incomeStatement) {
    tables.push({
      title: 'PERBANDINGAN RENCANA VS AKTUAL',
      head: [['Metric', 'Rencana', 'Aktual', 'Selisih']],
      body: [
        [
          'Pendapatan',
          formatReportRp(incomeStatement.summary.plannedIncome),
          formatReportRp(incomeStatement.summary.actualIncome),
          formatSignedReportRp(incomeStatement.summary.actualIncome - incomeStatement.summary.plannedIncome),
        ],
        [
          'Pengeluaran',
          formatReportRp(incomeStatement.summary.plannedExpense),
          formatReportRp(incomeStatement.summary.actualExpense),
          formatSignedReportRp(incomeStatement.summary.actualExpense - incomeStatement.summary.plannedExpense),
        ],
        [
          'Laba/Rugi',
          formatSignedReportRp(incomeStatement.summary.plannedProfit),
          formatSignedReportRp(incomeStatement.summary.actualProfit),
          formatSignedReportRp(incomeStatement.summary.profitVariance),
        ],
      ],
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    });
  }

  return tables;
}

const getLogoDataUrl = (): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const img = new window.Image();
      img.src = '/logo arina.svg';
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 200;
        canvas.height = img.height || 200;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve('');
    } catch {
      resolve('');
    }
  });
};

function normalizePdfText(value: string) {
  return value
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x00-\x7F]/g, '');
}

export async function generatePdfReport(data: ReportData): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const logoDataUrl = await getLogoDataUrl();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentW = pageW - marginX * 2;
  const today = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const formatRp = (value: number) => `Rp ${Math.abs(value).toLocaleString('id-ID')}`;

  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, pageW, 5, 'F');

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', marginX, 12, 18, 18);
  }

  const titleX = marginX + (logoDataUrl ? 24 : 0);
  doc.setTextColor(6, 78, 59);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN KEUANGAN', titleX, 19);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Arina Agri - Platform Pencatatan Pertanian', titleX, 25);

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Dicetak: ${today}`, pageW - marginX, 25, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, 34, pageW - marginX, 34);

  let y = 44;

  const renderMetaRow = (label: string, value: string) => {
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label, marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${value}`, marginX + 27, y);
    y += 7;
  };

  renderMetaRow('PERIODE', data.periodeLabel);
  if (data.userName) renderMetaRow('PETANI', data.userName);
  if (data.project) {
    renderMetaRow('PROYEK', data.project.name);
    renderMetaRow('KOMODITAS', `${data.project.commodity} - ${data.project.landArea} ${data.project.landAreaUnit}`);
    renderMetaRow('MUSIM', data.project.seasonLabel);
  }

  y += 5;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('RINGKASAN KEUANGAN', marginX, y);

  y += 6;
  const boxW = (pageW - marginX * 2 - 8) / 3;
  const isProfit = data.labaBersih >= 0;
  const cards = [
    {
      label: 'TOTAL PEMASUKAN',
      value: formatRp(data.totalPendapatan),
      x: marginX,
      fill: [240, 253, 244] as const,
      border: [187, 247, 208] as const,
      text: [22, 163, 74] as const,
    },
    {
      label: 'TOTAL PENGELUARAN',
      value: formatRp(data.totalPengeluaran),
      x: marginX + boxW + 4,
      fill: [254, 242, 242] as const,
      border: [254, 202, 202] as const,
      text: [220, 38, 38] as const,
    },
    {
      label: isProfit ? 'LABA BERSIH' : 'RUGI BERSIH',
      value: formatRp(data.labaBersih),
      x: marginX + boxW * 2 + 8,
      fill: isProfit ? ([240, 253, 244] as const) : ([254, 242, 242] as const),
      border: isProfit ? ([187, 247, 208] as const) : ([254, 202, 202] as const),
      text: isProfit ? ([22, 163, 74] as const) : ([220, 38, 38] as const),
    },
  ];

  cards.forEach((card) => {
    doc.setFillColor(card.fill[0], card.fill[1], card.fill[2]);
    doc.setDrawColor(card.border[0], card.border[1], card.border[2]);
    doc.roundedRect(card.x, y, boxW, 22, 3, 3, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(card.text[0], card.text[1], card.text[2]);
    doc.text(card.label, card.x + 4, y + 7);
    doc.setFontSize(12);
    doc.text(card.value, card.x + 4, y + 16);
  });

  y += 32;

  buildPdfReportTables(data).forEach((table, tableIndex) => {
    if (tableIndex > 0) {
      y = ((doc as unknown as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y) + 11;
    }

    if (y + 24 > pageH - 18) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(table.title, marginX, y);

    autoTable(doc, {
      startY: y + 4,
      head: table.head,
      body: table.body,
      margin: { left: marginX, right: marginX },
      styles: {
        font: 'helvetica',
        fontSize: 7.2,
        cellPadding: 2.2,
        overflow: 'linebreak',
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        halign: 'left',
      },
      alternateRowStyles: { fillColor: [250, 252, 253] },
      columnStyles: table.columnStyles,
      didParseCell: (hookData) => {
        if (hookData.section !== 'body') return;
        const rawValue = String(hookData.cell.raw ?? '');
        if (rawValue.startsWith('+')) {
          hookData.cell.styles.textColor = [22, 163, 74];
        }
        if (rawValue.startsWith('-')) {
          hookData.cell.styles.textColor = [220, 38, 38];
        }
      },
    });
  });

  if (data.aiAnalysis) {
    let currentY = ((doc as unknown as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y) + 14;
    if (currentY + 20 > pageH - 20) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(marginX, currentY - 5, contentW, 10, 2, 2, 'FD');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text('ANALISIS & REKOMENDASI AI', marginX + 3, currentY + 1.5);
    currentY += 12;

    const rawLines = data.aiAnalysis.split('\n');
    rawLines.forEach((rawLine) => {
      let line = normalizePdfText(rawLine.trim());
      if (!line || line.match(/^[-*_]{3,}$/)) {
        currentY += 2;
        return;
      }

      const isHeading = line.match(/^#{1,3}\s/) || line.match(/^\*\*.*\*\*$/);
      const isBullet = !isHeading && (line.match(/^[-*]\s/) || line.match(/^\d+\.\s/));
      line = line
        .replace(/^#{1,3}\s/, '')
        .replace(/^\*\*(.*)\*\*$/, '$1')
        .replace(/^[-*]\s/, '')
        .replace(/^\d+\.\s/, '')
        .replace(/\*\*/g, '');

      const indent = isBullet ? 5 : 0;
      const maxWidth = contentW - indent;
      const splitLines = doc.splitTextToSize(line, maxWidth) as string[];

      if (isHeading) {
        currentY += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(22, 163, 74);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
      }

      splitLines.forEach((splitLine, lineIndex) => {
        if (currentY > pageH - 20) {
          doc.addPage();
          currentY = 20;
        }
        if (isBullet && lineIndex === 0) {
          doc.setFont('helvetica', 'bold');
          doc.text('-', marginX, currentY);
          doc.setFont('helvetica', 'normal');
        }
        doc.text(splitLine, marginX + indent, currentY);
        currentY += isHeading ? 5 : 4.5;
      });

      currentY += isHeading ? 1 : 1.5;
    });
  }

  const pageCount = (doc as unknown as JsPdfWithPageCount).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Laporan dibuat secara otomatis oleh Arina Agri', marginX, footerY);
    doc.text(`Halaman ${i} dari ${pageCount}`, pageW - marginX, footerY, { align: 'right' });
  }

  const fileName = `Laporan_Keuangan_Arina_${data.periode.replace('-', '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}
