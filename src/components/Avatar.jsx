const BACKGROUNDS = ['#FDECEC', '#E8F0FE', '#E7F8F1', '#FEF3C7', '#F3E8FF', '#E0F7FA', '#FCE7F3', '#F1F5F9'];
const INKS = ['#8F1216', '#1F6FEB', '#047857', '#B45309', '#6D28D9', '#0E7490', '#BE185D', '#334155'];

export default function Avatar({ name = '', size = 36 }) {
  const parts = String(name).split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
  const index = [...String(name)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % BACKGROUNDS.length;
  return (
    <span className="avatar-badge" style={{ width: size, height: size, background: BACKGROUNDS[index], color: INKS[index], fontSize: size < 32 ? 11 : 13 }} aria-hidden="true">{initials}</span>
  );
}
