import { useMemo } from 'react';
import { Command } from 'cmdk';
import { useStore, ROLES, SCREENS } from '../store.jsx';
import { useUi } from '../ui.jsx';
import { go, useRoute } from '../router.js';
import { liveAssets, liveEnquiries, liveUnits } from '../data/selectors.js';
import { enquiryUnitLabel, unitLabel } from '../labels.js';

export default function CommandPalette() {
  const { state, dispatch, data } = useStore();
  const route = useRoute();
  const { palette, setPalette, setPresenter, presenter, setResetOpen } = useUi();
  const keepRoute = (roleId) => {
    dispatch({ type: 'role', role: roleId });
    const def = SCREENS.find((item) => item.id === route.screen);
    if (def && route.params.length > 0 && def.roles.includes(roleId)) go(route.screen, ...route.params, route.search);
    else go(ROLES[roleId].landing);
  };
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
    <Command.Dialog
      open={palette}
      onOpenChange={setPalette}
      label="Search or jump to"
      className="palette"
      filter={(value, search) => (search && value.toLowerCase().includes(search.toLowerCase()) ? 1 : search ? 0 : 1)}
    >
      <Command.Input placeholder="Search or jump to…" />
      <Command.List>
        <Command.Empty>No matches. Try a business, a lot, or a screen.</Command.Empty>
        <Command.Group heading="Actions">
          {state.role === 'leasing' && !state.heroStage && (
            <Command.Item value="action simulate enquiry" onSelect={() => run(() => { dispatch({ type: 'simulateHero' }); go('pipeline'); })}>
              Simulate enquiry
            </Command.Item>
          )}
          {state.role === 'management' && (
            <Command.Item value="action add asset" onSelect={() => run(() => go('settings'))}>Add asset</Command.Item>
          )}
          <Command.Item value="action export current table" onSelect={() => run(() => document.querySelector('main .export-btn')?.click())}>
            Export current table
          </Command.Item>
          {Object.values(ROLES).filter((item) => item.id !== state.role).map((item) => (
            <Command.Item key={item.id} value={`action switch role to ${item.name}`} onSelect={() => run(() => keepRoute(item.id))}>
              Switch role to {item.name}
            </Command.Item>
          ))}
          <Command.Item value="action reset demo" onSelect={() => run(() => setResetOpen(true))}>Reset demo</Command.Item>
          <Command.Item value="action presenter mode" onSelect={() => run(() => setPresenter(!presenter))}>
            Presenter mode {presenter ? 'off' : 'on'}
          </Command.Item>
        </Command.Group>
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
              {enquiry.business}{enquiry.lot ? `, ${enquiryUnitLabel(enquiry, units)}` : ''}
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
                value={`${unitLabel(unit)} ${asset?.short || ''} ${asset?.name || ''} ${unit.id}`}
                onSelect={() => run(() => go('asset', unit.asset, { lot: unit.id }))}
              >
                {unitLabel(unit)}{asset?.short ? `, ${asset.short}` : ''}
              </Command.Item>
            );
          })}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
