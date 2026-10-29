import { useEffect } from 'react';
import { can, NAV, ROLES } from './access.js';
import Shell from './components/Shell.jsx';
import { go } from './router.js';
import { useAmp } from './useAmp.jsx';
import Login from './screens/Login.jsx';
import Overview from './screens/Overview.jsx';
import Activations from './screens/Activations.jsx';
import ActivationDetail from './screens/ActivationDetail.jsx';
import Forms from './screens/Forms.jsx';
import FormBuilder from './screens/FormBuilder.jsx';
import PublicForm from './screens/PublicForm.jsx';
import QrDetail from './screens/QrDetail.jsx';
import Audience from './screens/Audience.jsx';
import Profile from './screens/Profile.jsx';
import Segments from './screens/Segments.jsx';
import Insights from './screens/Insights.jsx';
import Channels from './screens/Channels.jsx';
import Budget from './screens/Budget.jsx';
import Assets from './screens/Assets.jsx';
import Reports from './screens/Reports.jsx';
import ImportData from './screens/ImportData.jsx';
import Footfall from './screens/Footfall.jsx';
import Settings from './screens/Settings.jsx';
import Privacy from './screens/Privacy.jsx';

const PAGES = {
  overview: Overview,
  activations: Activations,
  forms: Forms,
  audience: Audience,
  segments: Segments,
  insights: Insights,
  channels: Channels,
  budget: Budget,
  assets: Assets,
  reports: Reports,
  import: ImportData,
  footfall: Footfall,
  settings: Settings,
};

export default function App() {
  const { state, route } = useAmp();
  const screen = route.screen;
  useEffect(() => {
    if (screen === 'f' || screen === 'privacy') {
      document.title = screen === 'privacy' ? 'Privacy notice – PKNS AMP Hub' : 'Registration – PKNS AMP Hub';
      return;
    }
    const name = NAV.find((item) => item.id === screen)?.name;
    document.title = name ? `${name} – PKNS AMP Hub` : 'PKNS AMP Hub';
  }, [screen]);

  if (screen === 'f' || screen === 'kiosk') return <PublicForm kiosk={screen === 'kiosk'} />;
  if (screen === 'privacy') return <Privacy />;
  if (!state.role) return <Login />;

  const role = ROLES[state.role];
  let current = screen || role.landing;
  let page = null;
  if (!screen) {
    go(role.landing);
    return null;
  }
  if (screen === 'activation' && route.params[0]) {
    current = 'activations';
    page = <ActivationDetail key={route.params[0]} id={route.params[0]} />;
  } else if (screen === 'qr' && route.params[0]) {
    current = 'forms';
    page = <QrDetail id={route.params[0]} />;
  } else if (screen === 'form' && route.params[0]) {
    current = 'forms';
    page = <FormBuilder key={route.params[0]} id={route.params[0]} />;
  } else if (screen === 'segment' && route.params[0]) {
    current = 'segments';
    page = <Segments id={route.params[0]} />;
  } else if (screen === 'profile' && route.params[0]) {
    current = 'audience';
    if (!can(state.role, 'profile.open')) {
      go('insights');
      return null;
    }
    page = <Profile id={route.params[0]} />;
  } else if (screen === 'asset' && route.params[0] && route.params[0] !== 'new') {
    current = 'assets';
    page = <Assets id={route.params[0]} />;
  } else if (PAGES[screen]) {
    const allowed = NAV.find((item) => item.id === screen)?.roles.includes(state.role);
    if (!allowed) {
      go(role.landing);
      return null;
    }
    const Page = PAGES[screen];
    page = <Page />;
  } else {
    go(role.landing);
    return null;
  }
  return <Shell current={current}>{page}</Shell>;
}
