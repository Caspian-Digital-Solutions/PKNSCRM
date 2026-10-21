import { useEffect, useMemo, useState } from 'react';
import { toQrEnquiry } from './qrEnquiry.js';

// Supabase REST, no extra client library. Missing keys or a failed request
// return quietly so Simulate enquiry still runs the storyline.

let cachedRows = [];

function envText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function supabaseUrl() {
  return envText(import.meta.env && import.meta.env.VITE_SUPABASE_URL).replace(/\/$/, '');
}

export function supabaseAnonKey() {
  return envText(import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function qrStoreConfigured() {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

export function qrPageUrl() {
  const configured = envText(import.meta.env && import.meta.env.VITE_HOSTED_URL).replace(/\/$/, '');
  const origin = configured || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${origin}/#/qr`;
}

function headers(extra = {}) {
  const key = supabaseAnonKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  };
}

export async function insertQrEnquiry(row) {
  if (!qrStoreConfigured()) return { ok: false, reason: 'unconfigured' };
  try {
    const res = await fetch(`${supabaseUrl()}/rest/v1/qr_enquiries`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify(row),
    });
    if (!res.ok) return { ok: false, reason: 'unreachable' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}

// null means the store could not be read. [] means it answered with no rows.
export async function fetchRecentQrEnquiries() {
  if (!qrStoreConfigured()) return [];
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    select: 'id,created_at,name,business,space_type,asset,phone',
    order: 'created_at.asc',
  });
  params.append('created_at', `gte.${since}`);
  try {
    const res = await fetch(`${supabaseUrl()}/rest/v1/qr_enquiries?${params}`, { headers: headers() });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows : null;
  } catch {
    return null;
  }
}

export function useQrEnquiries() {
  const [rows, setRows] = useState(cachedRows);
  const [ready, setReady] = useState(!qrStoreConfigured());

  useEffect(() => {
    if (!qrStoreConfigured()) {
      setReady(true);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      const next = await fetchRecentQrEnquiries();
      if (cancelled) return;
      if (next) {
        const same = cachedRows.length === next.length && cachedRows.every((row, i) => row.id === next[i].id && row.created_at === next[i].created_at);
        cachedRows = next;
        if (!same) setRows(next);
      }
      setReady(true);
    };
    load();
    const timer = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const enquiries = useMemo(() => rows.map(toQrEnquiry).filter(Boolean), [rows]);
  return { rows, enquiries, ready };
}
