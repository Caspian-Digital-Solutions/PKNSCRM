export function maskName(name) {
  if (!name) return '–';
  return String(name).split(/\s+/).filter(Boolean).map((part, index) => {
    if (index === 0) return `${part.slice(0, Math.min(3, part.length))}***`;
    return `${part.slice(0, 1)}***`;
  }).join(' ');
}

export function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 4) return '•••';
  const head = digits.slice(0, 3);
  const tail = digits.slice(-4);
  return `${head}-•••• ${tail}`;
}

export function maskEmail(email) {
  const [user, domain] = String(email || '').split('@');
  if (!domain) return '***';
  return `${(user || '').slice(0, 2)}***@${domain}`;
}

export function showsPersonal(role) {
  return role !== 'management';
}
