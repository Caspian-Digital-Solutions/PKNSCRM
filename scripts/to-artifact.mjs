// Turns the single-file build into the page fragment the preview host expects (it adds its own html/head/body).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const html = readFileSync('dist-single/index.html', 'utf8');
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]).join('\n');
const title = (html.match(/<title>[\s\S]*?<\/title>/) || [''])[0];
const fonts = pick(/<link[^>]+fonts\.(googleapis|gstatic)[^>]*>/g);
const styles = pick(/<style[\s\S]*?<\/style>/g);
const scripts = pick(/<script[\s\S]*?<\/script>/g);
const body = html.replace(/[\s\S]*<body[^>]*>/, '').replace(/<\/body>[\s\S]*/, '').replace(/<script[\s\S]*?<\/script>/g, '').trim();
mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/pkns-asset-marketing-hub.html', [title, fonts, styles, body, scripts].join('\n'));
console.log('artifact bytes', Buffer.byteLength([title, fonts, styles, body, scripts].join('\n')));
