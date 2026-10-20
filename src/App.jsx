import { useStore, ROLES, SCREENS } from './store.jsx';
import { useRoute, go } from './router.js';
import Shell from './components/Shell.jsx';
import Login from './screens/Login.jsx';
import Placeholder from './screens/Placeholder.jsx';
import DataCheck from './screens/DataCheck.jsx';
import DataTable from './components/DataTable.jsx';
import Num from './components/Num.jsx';
import Term from './components/Term.jsx';
import Kpi from './components/Kpi.jsx';
import Filters from './components/Filters.jsx';
import ExportButton from './components/ExportButton.jsx';
import Modal from './components/Modal.jsx';

// Shared Phase 0 components. Screens register themselves in BUILT in later phases.
export const sharedComponents = { DataTable, Num, Term, Kpi, Filters, ExportButton, Modal };

const BUILT = {};

export default function App() {
  const { state } = useStore();
  const { screen, params } = useRoute();
  if (!state.role) return <Login />;
  const role = ROLES[state.role];
  if (screen === 'data-check') return <Shell current="data-check"><DataCheck /></Shell>;
  const def = SCREENS.find((s) => s.id === screen);
  if (!def || !def.roles.includes(state.role)) {
    go(role.landing);
    return null;
  }
  const Screen = BUILT[screen];
  return <Shell current={screen}>{Screen ? <Screen params={params} /> : <Placeholder id={screen} />}</Shell>;
}
