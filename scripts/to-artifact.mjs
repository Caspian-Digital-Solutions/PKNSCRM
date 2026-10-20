// Copies the single-file Vite build into one HTML document that opens offline.
// Google font links are removed so the file does not wait on the network.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const html = readFileSync('dist-single/index.html', 'utf8')
  .replace(/<link[^>]+fonts\.(googleapis|gstatic)[^>]*>\s*/g, '');

if (!/^<!doctype html>/i.test(html.trim()) || !/<script[\s>]/i.test(html)) {
  throw new Error('dist-single/index.html is not a complete document with a script');
}

mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/pkns-asset-marketing-hub.html', html);
console.log('artifact bytes', Buffer.byteLength(html));
