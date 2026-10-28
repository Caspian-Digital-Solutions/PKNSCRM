import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportReportPdf({ filename = 'amp-report.pdf', title, subtitle, sections = [] }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const drawHeader = () => {
    doc.setFillColor(227, 27, 35);
    doc.rect(0, 0, 297, 3.2, 'F');
    doc.setTextColor(35, 31, 32);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, 10, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    if (subtitle) doc.text(subtitle, 10, 21);
  };
  drawHeader();
  let y = subtitle ? 28 : 22;
  sections.forEach((section) => {
    if (y > 180) {
      doc.addPage();
      drawHeader();
      y = 28;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(35, 31, 32);
    doc.text(section.heading, 10, y);
    if (section.lines?.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      section.lines.forEach((line) => {
        y += 6;
        if (y > 190) {
          doc.addPage();
          drawHeader();
          y = 28;
        }
        doc.text(String(line), 10, y);
      });
      y += 8;
    }
    if (section.columns && section.rows) {
      autoTable(doc, {
        startY: y + 2,
        head: [section.columns.map((col) => col.label)],
        body: section.rows.map((row) => section.columns.map((col) => {
          const value = typeof col.exportValue === 'function' ? col.exportValue(row) : row[col.key];
          return value == null ? '' : String(value);
        })),
        styles: { fontSize: 8, textColor: [35, 31, 32] },
        headStyles: { fillColor: [61, 90, 128], textColor: 255 },
        margin: { left: 10, right: 10 },
      });
      y = doc.lastAutoTable.finalY + 8;
    }
  });
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
