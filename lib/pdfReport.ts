/**
 * Laporan Keuangan PDF Generator untuk Arina Agri
 * Menggunakan jsPDF + jspdf-autotable
 */

import type { Transaction } from '@/lib/mockData';

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
  transactions: Transaction[];
  userName?: string;
  aiAnalysis?: string;
}

export async function generatePdfReport(data: ReportData): Promise<void> {
  // Dynamic import so jsPDF does not affect SSR
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 14;

  const formatRp = (n: number) =>
    `Rp ${Math.abs(n).toLocaleString('id-ID')}`;
  const today = new Date().toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // ── Header ──────────────────────────────────────────────────────
  doc.setFillColor(6, 78, 59); // dark green
  doc.rect(0, 0, pageW, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN KEUANGAN', marginX, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Arina Agri — Platform Keuangan Petani', marginX, 20);
  doc.text(`Dicetak: ${today}`, pageW - marginX, 20, { align: 'right' });

  // ── Meta info ───────────────────────────────────────────────────
  doc.setTextColor(30, 30, 30);
  let y = 40;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PERIODE LAPORAN', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.periodeLabel, marginX + 45, y);

  if (data.userName) {
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('NAMA PETANI', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.userName, marginX + 45, y);
  }

  // ── Ringkasan Keuangan ──────────────────────────────────────────
  y += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 78, 59);
  doc.text('RINGKASAN KEUANGAN', marginX, y);
  doc.setTextColor(30, 30, 30);

  y += 5;
  // 3 summary boxes
  const boxW = (pageW - marginX * 2 - 8) / 3;

  // Income box
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(marginX, y, boxW, 22, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL PENDAPATAN', marginX + 3, y + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text(formatRp(data.totalPendapatan), marginX + 3, y + 15);

  // Expense box
  const box2X = marginX + boxW + 4;
  doc.setFillColor(255, 241, 242);
  doc.roundedRect(box2X, y, boxW, 22, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL PENGELUARAN', box2X + 3, y + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text(formatRp(data.totalPengeluaran), box2X + 3, y + 15);

  // Net profit/loss box
  const box3X = marginX + boxW * 2 + 8;
  const isProfit = data.labaBersih >= 0;
  doc.setFillColor(isProfit ? 240 : 255, isProfit ? 253 : 241, isProfit ? 244 : 242);
  doc.roundedRect(box3X, y, boxW, 22, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(isProfit ? 'LABA BERSIH' : 'RUGI BERSIH', box3X + 3, y + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isProfit ? 22 : 220, isProfit ? 163 : 38, isProfit ? 74 : 38);
  doc.text(formatRp(data.labaBersih), box3X + 3, y + 15);

  // ── Tabel Transaksi ─────────────────────────────────────────────
  y += 30;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 78, 59);
  doc.text('RINCIAN TRANSAKSI', marginX, y);
  doc.setTextColor(30, 30, 30);

  const sortedTx = [...data.transactions].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  autoTable(doc, {
    startY: y + 4,
    head: [['Tanggal', 'Kategori', 'Keterangan', 'Jenis', 'Nominal']],
    body: sortedTx.map((tx) => [
      tx.tanggal,
      tx.kategori,
      tx.keterangan || '—',
      tx.jenis === 'pendapatan' ? 'Pendapatan' : 'Pengeluaran',
      (tx.jenis === 'pendapatan' ? '+ ' : '− ') + formatRp(tx.nominal),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [6, 78, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 28 },
      2: { cellWidth: 60 },
      3: { cellWidth: 26 },
      4: { cellWidth: 36, halign: 'right' },
    },
    didParseCell: (hookData) => {
      if (hookData.column.index === 4 && hookData.section === 'body') {
        const val = hookData.cell.raw as string;
        if (val.startsWith('+')) {
          hookData.cell.styles.textColor = [22, 163, 74];
        } else {
          hookData.cell.styles.textColor = [220, 38, 38];
        }
      }
    },
  });

  // ── AI Analysis (jika ada) ──────────────────────────────────────
  if (data.aiAnalysis) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY + 12;

    if (finalY + 20 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
    }

    const analysisY = finalY > doc.internal.pageSize.getHeight() - 40 ? 20 : finalY;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 78, 59);
    doc.text('ANALISIS & REKOMENDASI AI', marginX, analysisY);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);

    const lines = doc.splitTextToSize(data.aiAnalysis, pageW - marginX * 2);
    doc.text(lines, marginX, analysisY + 7);
  }

  // ── Footer ──────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text('Laporan ini dibuat otomatis oleh Arina Agri • arina-agri.app', marginX, footerY);
    doc.text(`Halaman ${i} dari ${pageCount}`, pageW - marginX, footerY, { align: 'right' });
  }

  // ── Save ─────────────────────────────────────────────────────────
  const fileName = `Laporan_Keuangan_Arina_${data.periode.replace('-', '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}
