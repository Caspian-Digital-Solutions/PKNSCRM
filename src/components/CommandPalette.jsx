import { Command } from 'cmdk';
import { NAV, ROLES } from '../access.js';
import { useAmp } from '../useAmp.jsx';
import { go } from '../router.js';
import { useUi } from '../ui.jsx';
import { openScreen } from './bits.jsx';

export default function CommandPalette() {
  const { state, dispatch, route, assets } = useAmp();
  const { palette, setPalette, setResetOpen } = useUi();
  const close = () => setPalette(false);
  const run = (fn) => { close(); fn(); };
  return (
    <Command.Dialog open={palette} onOpenChange={setPalette} label="Search or jump to" className="palette">
      <Command.Input placeholder="Search or jump to…" />
      <Command.List>
        <Command.Empty>No matches.</Command.Empty>
        <Command.Group heading="Screens">
          {NAV.filter((item) => item.roles.includes(state.role)).map((item) => (
            <Command.Item key={item.id} value={`screen ${item.name}`} onSelect={() => run(() => openScreen(item.id, route.search))}>{item.name}</Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Assets">
          {assets.map((asset) => (
            <Command.Item key={asset.id} value={`asset ${asset.name}`} onSelect={() => run(() => openScreen('asset', route.search, asset.id))}>{asset.name}</Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Role">
          {Object.values(ROLES).map((item) => (
            <Command.Item key={item.id} value={`role ${item.name}`} onSelect={() => run(() => { dispatch({ type: 'role', role: item.id, userName: ROLES[state.role].person, roleName: item.name }); go(item.landing); })}>
              Switch to {item.name}
            </Command.Item>
          ))}
          <Command.Item value="reset demo" onSelect={() => run(() => setResetOpen(true))}>Reset demo</Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
