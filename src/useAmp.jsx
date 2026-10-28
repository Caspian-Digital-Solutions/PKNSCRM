import { createContext, useContext, useMemo } from 'react';
import { useStore } from './store.jsx';
import { buildView } from './data/selectors.js';
import { useRoute } from './router.js';

const Amp = createContext(null);

export function AmpProvider({ children }) {
  const { data, state, dispatch } = useStore();
  const route = useRoute();
  const view = useMemo(
    () => buildView(data, state, route.search),
    [data, state.rev, state.role, route.search],
  );
  const value = useMemo(() => ({
    data,
    state,
    dispatch,
    route,
    ...view,
    audit: [...(state.auditExtra || []), ...data.audit],
  }), [data, state, dispatch, route, view]);
  return <Amp.Provider value={value}>{children}</Amp.Provider>;
}

export function useAmp() {
  return useContext(Amp);
}
