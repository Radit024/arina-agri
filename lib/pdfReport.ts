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

// Helper to load SVG logo and convert to PNG data URL
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
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
    } catch {
      resolve('');
    }
  });
};

export async function generatePdfReport(data: ReportData): Promise<void> {
  // Dynamic import so jsPDF does not affect SSR
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const logoDataUrl = await getLogoDataUrl();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 14;

  const formatRp = (n: number) =>
    `Rp ${Math.abs(n).toLocaleString('id-ID')}`;
  const today = new Date().toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // ── Header (Clean Modern Design) ─────────────────────────────────
  // Top green accent line
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
  doc.text('Arina Agri — Platform Pencatatan Pertanian', titleX, 25);
  
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Dicetak: ${today}`, pageW - marginX, 25, { align: 'right' });

  // Thin separator line
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, 34, pageW - marginX, 34);

  // ── Meta info ───────────────────────────────────────────────────
  let y = 44;

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PERIODE', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${data.periodeLabel}`, marginX + 25, y);

  if (data.userName) {
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('PETANI', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${data.userName}`, marginX + 25, y);
  }

  // ── Ringkasan Keuangan ──────────────────────────────────────────
  y += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('RINGKASAN KEUANGAN', marginX, y);

  y += 6;
  const boxW = (pageW - marginX * 2 - 8) / 3;

  // Income box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208); // green-200
  doc.roundedRect(marginX, y, boxW, 22, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('TOTAL PEMASUKAN', marginX + 4, y + 7);
  doc.setFontSize(12);
  doc.text(formatRp(data.totalPendapatan), marginX + 4, y + 16);

  // Expense box
  const box2X = marginX + boxW + 4;
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202); // red-200
  doc.roundedRect(box2X, y, boxW, 22, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('TOTAL PENGELUARAN', box2X + 4, y + 7);
  doc.setFontSize(12);
  doc.text(formatRp(data.totalPengeluaran), box2X + 4, y + 16);

  // Net profit/loss box
  const box3X = marginX + boxW * 2 + 8;
  const isProfit = data.labaBersih >= 0;
  doc.setFillColor(isProfit ? 240 : 254, isProfit ? 253 : 242, isProfit ? 244 : 242);
  doc.setDrawColor(isProfit ? 187 : 254, isProfit ? 247 : 202, isProfit ? 208 : 202);
  doc.roundedRect(box3X, y, boxW, 22, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isProfit ? 22 : 220, isProfit ? 163 : 38, isProfit ? 74 : 38);
  doc.text(isProfit ? 'LABA BERSIH' : 'RUGI BERSIH', box3X + 4, y + 7);
  doc.setFontSize(12);
  doc.text(formatRp(data.labaBersih), box3X + 4, y + 16);

  // ── Tabel Transaksi ─────────────────────────────────────────────
  y += 32;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('RINCIAN TRANSAKSI', marginX, y);

  const sortedTx = [...data.transactions].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  autoTable(doc, {
    startY: y + 4,
    head: [['Tanggal', 'Kategori', 'Keterangan', 'Jenis', 'Nominal']],
    body: sortedTx.map((tx) => [
      tx.tanggal,
      tx.kategori,
      tx.keterangan || '—',
      tx.jenis === 'pendapatan' ? 'Pemasukan' : 'Pengeluaran',
      (tx.jenis === 'pendapatan' ? '+ ' : '- ') + formatRp(tx.nominal),
    ]),
    styles: { fontSize: 8.5, cellPadding: 4, font: 'helvetica', lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'left' },
    alternateRowStyles: { fillColor: [250, 252, 253] },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 28 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 26 },
      4: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
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
    const finalY = ((doc as unknown as JsPdfWithAutoTable).lastAutoTable?.finalY ?? 0) + 14;

    if (finalY + 20 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
    }

    let currentY = finalY > doc.internal.pageSize.getHeight() - 40 ? 20 : finalY;

    // AI Section Header with light green background
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(marginX, currentY - 5, pageW - marginX * 2, 10, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text('ANALISIS & REKOMENDASI AI', marginX + 3, currentY + 1.5);

    currentY += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // slate-700

    // Custom Markdown-like Parser for jsPDF
    const rawLines = data.aiAnalysis.split('\n');
    const pageH = doc.internal.pageSize.getHeight();

    for (let i = 0; i < rawLines.length; i++) {
      let line = rawLines[i].trim();
      
      // Skip empty lines or horizontal rules
      if (!line || line.match(/^[-*_]{3,}$/)) {
        currentY += 2;
        continue;
      }

      let isHeading = false;
      let isBullet = false;
      let bulletChar = '';

      // Detect Headings
      const strippedLine = line.replace(/\*\*/g, '');
      if (strippedLine.match(/^#{1,3}\s/)) {
        isHeading = true;
        line = strippedLine.replace(/^#{1,3}\s/, '');
      } else if (line.match(/^\*\*.*?\*\*$/)) {
        isHeading = true;
        line = strippedLine;
      } else if (strippedLine.match(/^[A-Z0-9\s&()\-.,]+$/) && strippedLine.length > 5 && /[A-Z]/.test(strippedLine)) {
        isHeading = true;
        line = strippedLine;
      }

      // Detect Bullets / Lists (only if not a heading)
      if (!isHeading) {
        if (line.match(/^[-*]\s/)) {
          isBullet = true;
          bulletChar = '•';
          line = line.replace(/^[-*]\s/, '');
        } else if (line.match(/^\d+\.\s/)) {
          isBullet = true;
          bulletChar = line.match(/^\d+\.\s/)?.[0] ?? '';
          line = line.replace(/^\d+\.\s/, '');
        }
      }

      // Clean unsupported unicode
      line = line
        .replace(/“|”/g, '"')
        .replace(/‘|’/g, "'")
        .replace(/—/g, '-')
        .replace(/[^\x00-\x7F]/g, ''); // Stick to basic ASCII for standard fonts

      // Helper to render text with inline bold segments
      const renderRichLine = (textStr: string, xPos: number, yPos: number, maxWidth: number) => {
        // Split by ** markers
        const segments = textStr.split(/(\*\*.*?\*\*)/g);
        let currentX = xPos;
        let currentY = yPos;
        const normalFontSize = 9;
        
        // We need to handle internal wrapping if a single line is too long
        // Simplest: use doc.splitTextToSize on a clean version to find wrap points
        const cleanText = textStr.replace(/\*\*/g, '');
        doc.splitTextToSize(cleanText, maxWidth);
        
        // This is a simplified rich text wrapper
        // It's hard to perfectly map segments to wrapped lines, 
        // so we'll just render each segment and manually wrap if currentX > xPos + maxWidth
        
        doc.setFontSize(normalFontSize);
        
        segments.forEach(segment => {
          if (!segment) return;
          
          const isBold = segment.startsWith('**') && segment.endsWith('**');
          const cleanSegment = isBold ? segment.slice(2, -2) : segment;
          
          doc.setFont('helvetica', isBold ? 'bold' : 'normal');
          
          // Split segment into words to handle wrapping
          const words = cleanSegment.split(/(\s+)/);
          
          words.forEach(word => {
            const wordWidth = doc.getTextWidth(word);
            
            if (currentX + wordWidth > xPos + maxWidth && currentX > xPos) {
              currentX = xPos;
              currentY += 4.5;
              if (currentY > pageH - 20) {
                doc.addPage();
                currentY = 20;
              }
            }
            
            doc.text(word, currentX, currentY);
            currentX += wordWidth;
          });
        });
        
        return currentY + 4.5;
      };

      // Render Line
      if (isHeading) {
        currentY += 6; // Add top spacing for heading
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 163, 74); // green-600
        doc.setFontSize(10);
        
        const splitLines = doc.splitTextToSize(line.replace(/\*\*/g, ''), pageW - marginX * 2);
        for (let j = 0; j < splitLines.length; j++) {
          if (currentY > pageH - 20) { doc.addPage(); currentY = 20; }
          doc.text(splitLines[j], marginX, currentY);
          currentY += 5;
        }
        currentY += 1; // Add bottom spacing
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85); // slate-700
        doc.setFontSize(9);
        
        const indent = isBullet ? (bulletChar.length > 1 ? 8 : 5) : 0;
        
        if (isBullet) {
          if (currentY > pageH - 20) { doc.addPage(); currentY = 20; }
          doc.setFont('helvetica', 'bold');
          doc.text(bulletChar.trim(), marginX, currentY);
          currentY = renderRichLine(line, marginX + indent, currentY, pageW - marginX * 2 - indent);
        } else {
          currentY = renderRichLine(line, marginX, currentY, pageW - marginX * 2);
        }
        currentY += 1.5; // Add paragraph spacing
      }
    }
  }

  // ── Footer ──────────────────────────────────────────────────────
  const pageCount = (doc as unknown as JsPdfWithPageCount).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Laporan dibuat secara otomatis oleh Arina Agri', marginX, footerY);
    doc.text(`Halaman ${i} dari ${pageCount}`, pageW - marginX, footerY, { align: 'right' });
  }

  // ── Save ─────────────────────────────────────────────────────────
  const fileName = `Laporan_Keuangan_Arina_${data.periode.replace('-', '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}
