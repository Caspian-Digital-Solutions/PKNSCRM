import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';

export const QR_STYLE = {
  foreground: '#111827',
  background: '#FFFFFF',
  logo: 'PKNS',
  frame: 'Scan to register',
  frameText: '',
  cornerStyle: 'Rounded',
};

export function frameLabel(style) {
  if (!style?.frame || style.frame === 'None') return '';
  if (style.frame === 'Custom') return style.frameText || '';
  return style.frame;
}

export function QrPreview({ value, style = QR_STYLE, size = 160, canvasId }) {
  const label = frameLabel(style);
  const rounded = style.cornerStyle !== 'Square';
  return (
    <div className="qr-art" style={{ background: style.background, borderRadius: rounded ? 16 : 0 }}>
      {label ? <p className="qr-cta">{label}</p> : null}
      <QRCodeCanvas id={canvasId} value={value || 'https://pkns.gov.my'} size={size} fgColor={style.foreground || '#111827'} bgColor={style.background || '#FFFFFF'} level="M" includeMargin />
      <QRCodeSVG className="qr-svg-src" value={value || 'https://pkns.gov.my'} size={size} fgColor={style.foreground || '#111827'} bgColor={style.background || '#FFFFFF'} level="M" includeMargin aria-hidden="true" />
      {style.logo && style.logo !== 'None' ? <span className="qr-logo">{style.logo}</span> : null}
    </div>
  );
}

function pngData(canvasId, size = 1024) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return '';
  if (canvas.width === size) return canvas.toDataURL('image/png');
  const copy = document.createElement('canvas');
  copy.width = size;
  copy.height = size;
  const ctx = copy.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, size, size);
  return copy.toDataURL('image/png');
}

export function downloadPng(canvasId, filename) {
  const href = pngData(canvasId, 1024);
  if (!href) return;
  const link = document.createElement('a');
  link.href = href;
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.click();
}

export function downloadSvg(filename) {
  const node = document.querySelector('.qr-svg-src');
  if (!node) return;
  const blob = new Blob([node.outerHTML], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
  link.click();
}

export function downloadPdf(canvasId, layout, meta) {
  const image = pngData(canvasId, 1024);
  if (!image) return;
  const formats = { a4: 'a4', a5: 'a5', tent: 'a5', stickers: 'a4' };
  const doc = new jsPDF({ orientation: layout === 'tent' ? 'landscape' : 'portrait', format: formats[layout] || 'a4', unit: 'mm' });
  const page = layout === 'stickers' ? 6 : layout === 'tent' ? 2 : 1;
  for (let index = 0; index < page; index += 1) {
    if (index) doc.addPage();
    doc.setFontSize(16);
    doc.text(meta.title || 'PKNS', 14, 18);
    doc.setFontSize(11);
    doc.text(meta.when || '', 14, 26);
    doc.text(meta.venue || '', 14, 32);
    doc.text(frameLabel(meta.style) || 'Scan to register', 14, 40);
    const size = layout === 'stickers' ? 40 : layout === 'a5' ? 70 : 90;
    doc.addImage(image, 'PNG', 14, 46, size, size);
    doc.setFontSize(9);
    doc.text('PKNS', 14, doc.internal.pageSize.getHeight() - 12);
  }
  doc.save(`${meta.filename || 'qr'}-${layout}.pdf`);
}
