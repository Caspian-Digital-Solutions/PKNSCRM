import { useStore, ROLES, SCREENS } from './store.jsx';
import { useRoute, go } from './router.js';
import Shell from './components/Shell.jsx';
import Login from './screens/Login.jsx';
import Placeholder from './screens/Placeholder.jsx';
import DataCheck from './screens/DataCheck.jsx';

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
