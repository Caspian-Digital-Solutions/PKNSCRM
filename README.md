# PKNS AMP Hub

Prototype for Advertising, Marketing and Promotion. It captures audience data from activations, profiles that audience, and reports what AMP spend produced. All figures are demo data generated in the browser from a fixed seed.

Leasing, unit grids, rent and lease expiry are not part of this product. A RentX card on an asset is a read-only occupancy snapshot marked sample data.

## Run it

1. Install Node.js 20 or newer.
2. `npm install`
3. `npm run dev`, then open http://localhost:5173
4. Pick a role. AMP Manager is the full demo. Reset demo (footer, or Alt+Shift+R) clears session changes and keeps the role.

`npm run verify` and `npm run verify:consistency` check the seeded volumes and the section 15 acceptance rules. Both must print `ALL CHECKS PASSED`.

`npm run build` writes the static site to `dist`.

## Roles

AMP Manager, AMP Executive, Operator (Alam Sentral assets only), Management (aggregates only) and System Admin (settings). The header role switcher is for the demo.
