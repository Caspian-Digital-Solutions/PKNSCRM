// One clock for waiting, overdue and due dates. Malaysia working time is Monday to Friday, 9:00 to 18:00.

import { addDays, dateUTC, ymd } from './data/rng.js';

const MYT = 8 * 3600000;
const MINUTE = 60000;

export function workingMinutesBetween(fromIso, toIso) {
  const step = MINUTE;
  let t = new Date(fromIso).getTime();
  const end = new Date(toIso).getTime();
  let m = 0;
  while (t < end) {
    const x = new Date(t + MYT);
    const dow = x.getUTCDay();
    const h = x.getUTCHours() + x.getUTCMinutes() / 60;
    if (dow >= 1 && dow <= 5 && h >= 9 && h < 18) m += 1;
    t += step;
  }
  return m;
}

export function dueAfterWorkingMinutes(fromIso, minutes) {
  let t = new Date(fromIso).getTime();
  let left = minutes;
  while (left > 0) {
    const x = new Date(t + MYT);
    const dow = x.getUTCDay();
    const h = x.getUTCHours() + x.getUTCMinutes() / 60;
    if (dow >= 1 && dow <= 5 && h >= 9 && h < 18) left -= 1;
    t += MINUTE;
  }
  return new Date(t + MYT).toISOString().slice(0, 19) + '+08:00';
}

export function addCalendarDays(iso, days) {
  const day = String(iso).slice(0, 10);
  const rest = String(iso).length > 10 ? String(iso).slice(10) : 'T00:00:00+08:00';
  return ymd(addDays(dateUTC(day), days)) + rest;
}

export function addWorkingDays(iso, days) {
  let day = String(iso).slice(0, 10);
  const rest = String(iso).length > 10 ? String(iso).slice(10) : 'T00:00:00+08:00';
  let left = days;
  while (left > 0) {
    day = ymd(addDays(dateUTC(day), 1));
    const dow = dateUTC(day).getUTCDay();
    if (dow !== 0 && dow !== 6) left -= 1;
  }
  return day + rest;
}

export function nextWorkingSlot(nowIso, hour = 11, minute = 0) {
  let day = String(nowIso).slice(0, 10);
  const rest = `T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`;
  day = ymd(addDays(dateUTC(day), 1));
  while (dateUTC(day).getUTCDay() === 0 || dateUTC(day).getUTCDay() === 6) day = ymd(addDays(dateUTC(day), 1));
  let slot = day + rest;
  if (new Date(slot) < new Date(nowIso)) slot = String(nowIso).slice(0, 16) + ':00+08:00';
  return slot;
}

export function firstOfNextMonth(iso) {
  const [year, month] = String(iso).slice(0, 10).split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
}

export function elapsed(fromIso, now) {
  if (!fromIso || !now) return '';
  const ms = new Date(now).getTime() - new Date(fromIso).getTime();
  if (!Number.isFinite(ms) || ms < MINUTE) return 'Just now';
  const min = Math.floor(ms / MINUTE);
  if (min < 60) return `${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}
