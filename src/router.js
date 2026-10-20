import { useEffect, useState } from 'react';

// Hash routing (#/screen/param) so a page reload keeps the presenter on the same screen.
const parse = () => {
  const [screen = '', ...rest] = window.location.hash.replace(/^#\/?/, '').split('/');
  return { screen, params: rest.map(decodeURIComponent) };
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

export const go = (screen, ...params) => {
  window.location.hash = '/' + [screen, ...params.map(encodeURIComponent)].join('/');
};
