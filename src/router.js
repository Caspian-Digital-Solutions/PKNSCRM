import { useEffect, useState } from 'react';

// Hash routing (#/screen/param?filter=value) so a reload and the back button keep the screen and its filters.
const parse = () => {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const [screen = '', ...rest] = path.split('/').filter((part) => part !== '');
  const search = {};
  if (query) {
    for (const part of query.split('&')) {
      if (!part) continue;
      const [key, value = ''] = part.split('=');
      if (key) search[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  return { screen, params: rest.map(decodeURIComponent), search };
};

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function setSearch(patch) {
  const route = parse();
  const search = { ...route.search };
  Object.entries(patch).forEach(([key, value]) => {
    if (value == null || value === '') delete search[key];
    else search[key] = String(value);
  });
  go(route.screen || 'overview', ...route.params, search);
}

export const go = (screen, ...args) => {
  const params = [];
  const query = {};
  for (const arg of args) {
    if (arg && typeof arg === 'object') Object.assign(query, arg);
    else if (arg != null && arg !== '') params.push(String(arg));
  }
  const qs = Object.entries(query)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  const path = [screen, ...params.map(encodeURIComponent)].filter(Boolean).join('/');
  window.location.hash = `/${path}${qs ? `?${qs}` : ''}`;
};
