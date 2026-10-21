import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const PAGE_WIDTH = 297;
const PAGE_HEIGHT = 210;
const LAYOUTS = [
  { fontSize: 6.4, cellPadding: 0.55, measure: 38 },
  { fontSize: 5.4, cellPadding: 0.35, measure: 36 },
  { fontSize: 4.8, cellPadding: 0.25, measure: 34 },
];

function draw(model, logoDataUrl, layout) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFillColor(227, 27, 35);
  doc.rect(0, 0, PAGE_WIDTH, 3.2, 'F');
  let titleX = 8;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 8, 6, 28, 11);
      titleX = 40;
    } catch {
      titleX = 8;
    }
  }
  doc.setTextColor(35, 31, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Management report', titleX, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(model.monthLabel, titleX, 18);

  const gap = 3;
  const margin = 6;
  const width = (PAGE_WIDTH - margin * 2 - gap * 2) / 3;
  const valueWidth = (width - layout.measure) / 3;
  const blocks = [
    { title: 'Portfolio and leasing', rows: model.block1 },
    { title: 'Marketing to tenancy', rows: model.block2 },
    { title: 'Digital reach', rows: model.block3 },
  ];
  blocks.forEach((block, index) => {
    const left = margin + index * (width + gap);
    doc.setPage(1);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(35, 31, 32);
    doc.text(block.title, left, 24);
    autoTable(doc, {
      startY: 26,
      margin: { left, right: PAGE_WIDTH - left - width, top: 26, bottom: 12 },
      tableWidth: width,
      head: [['Measure', 'This month', 'Last month', 'Change']],
      body: block.rows.map((row) => [
        row.label,
        row.currentText,
        row.previousText,
        // Helvetica has no U+2212, so the PDF draws the same minus as a hyphen.
        String(row.changeText ?? '').replaceAll('\u2212', '-'),
      ]),
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: layout.fontSize,
        cellPadding: layout.cellPadding,
        textColor: [35, 31, 32],
        lineColor: [228, 225, 223],
        lineWidth: 0.1,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [227, 27, 35],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: layout.fontSize,
      },
      columnStyles: {
        0: { cellWidth: layout.measure },
        1: { cellWidth: valueWidth, halign: 'right' },
        2: { cellWidth: valueWidth, halign: 'right' },
        3: { cellWidth: valueWidth, halign: 'right' },
      },
      pageBreak: 'avoid',
      rowPageBreak: 'avoid',
    });
  });
  doc.setPage(1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(35, 31, 32);
  doc.text('Demo data · Prototype by Caspian Digital Solutions', margin, PAGE_HEIGHT - 6);
  return doc;
}

export function buildReportPdf(model, { logoDataUrl = null } = {}) {
  let doc = draw(model, logoDataUrl, LAYOUTS[0]);
  for (let i = 1; i < LAYOUTS.length && doc.getNumberOfPages() > 1; i += 1) {
    doc = draw(model, logoDataUrl, LAYOUTS[i]);
  }
  return doc;
}
