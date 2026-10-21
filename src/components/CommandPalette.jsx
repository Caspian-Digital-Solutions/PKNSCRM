import { useMemo } from 'react';
import { Command } from 'cmdk';
import { useStore, ROLES, SCREENS } from '../store.jsx';
import { useUi } from '../ui.jsx';
import { go } from '../router.js';
import { liveAssets, liveEnquiries, liveUnits } from '../data/selectors.js';

export default function CommandPalette() {
  const { state, dispatch, data } = useStore();
  const { palette, setPalette, setPresenter, presenter, setResetOpen } = useUi();
  const role = ROLES[state.role];
  const screens = SCREENS.filter((item) => !item.hidden && item.roles.includes(state.role));
  const enquiries = useMemo(() => liveEnquiries(data, state), [data, state]);
  const assets = useMemo(() => liveAssets(data, state), [data, state]);
  const units = useMemo(() => liveUnits(data, state), [data, state]);
  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  const close = () => setPalette(false);
  const run = (fn) => {
    close();
    fn();
  };

  return (
    <Command.Dialog open={palette} onOpenChange={setPalette} label="Search or jump to" className="palette">
      <Command.Input placeholder="Search or jump to…" />
      <Command.List>
        <Command.Empty>No matches. Try a business, a lot, or a screen.</Command.Empty>
        <Command.Group heading="Go to">
          {screens.map((item) => (
            <Command.Item key={item.id} value={`go ${item.name}`} onSelect={() => run(() => go(item.id))}>
              {item.name}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Enquiries">
          {enquiries.map((enquiry) => (
            <Command.Item
              key={enquiry.id}
              value={`${enquiry.business} ${enquiry.contact || ''} ${enquiry.lot || ''} ${enquiry.id}`}
              onSelect={() => run(() => go('enquiry', enquiry.id))}
            >
              {enquiry.business}{enquiry.lot ? `, lot ${enquiry.lot}` : ''}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Assets">
          {assets.map((asset) => (
            <Command.Item key={asset.id} value={`asset ${asset.name} ${asset.short}`} onSelect={() => run(() => go('asset', asset.id))}>
              {asset.name}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Campaigns">
          {data.campaigns.map((item) => (
            <Command.Item key={item.id} value={`campaign ${item.name} ${item.short}`} onSelect={() => run(() => go('campaign', item.id))}>
              {item.name}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Lots">
          {units.map((unit) => {
            const asset = assetById.get(unit.asset);
            return (
              <Command.Item
                key={unit.id}
                value={`lot ${unit.lot} ${asset?.short || ''} ${asset?.name || ''} ${unit.id}`}
                onSelect={() => run(() => go('asset', unit.asset, { lot: unit.id }))}
              >
                Lot {unit.lot}{asset?.short ? `, ${asset.short}` : ''}
              </Command.Item>
            );
          })}
        </Command.Group>
        <Command.Group heading="Actions">
          {state.role === 'leasing' && !state.heroStage && (
            <Command.Item value="simulate enquiry" onSelect={() => run(() => { dispatch({ type: 'simulateHero' }); go('pipeline'); })}>
              Simulate enquiry
            </Command.Item>
          )}
          {state.role === 'management' && (
            <Command.Item value="add asset" onSelect={() => run(() => go('settings'))}>Add asset</Command.Item>
          )}
          <Command.Item
            value="export current table"
            onSelect={() => run(() => document.querySelector('main .export-btn')?.click())}
          >
            Export current table
          </Command.Item>
          {Object.values(ROLES).filter((item) => item.id !== state.role).map((item) => (
            <Command.Item
              key={item.id}
              value={`switch role ${item.name} ${item.person}`}
              onSelect={() => run(() => { dispatch({ type: 'role', role: item.id }); go(item.landing); })}
            >
              Switch role to {item.name}
            </Command.Item>
          ))}
          <Command.Item value="reset demo" onSelect={() => run(() => setResetOpen(true))}>Reset demo</Command.Item>
          <Command.Item
            value="presenter mode"
            onSelect={() => run(() => setPresenter(!presenter))}
          >
            Presenter mode {presenter ? 'off' : 'on'}
          </Command.Item>
        </Command.Group>
      </Command.List>
      <p className="palette-hint">{role?.person}</p>
    </Command.Dialog>
  );
}
