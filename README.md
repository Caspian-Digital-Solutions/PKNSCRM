# PKNS Asset Marketing Hub — pitch prototype

Working prototype for the PKNS pitch on Wed 28 Oct 2026 (Google Meet, 60 minutes; demo slot 15 minutes).
Every figure is dummy data. Specs live in Confluence space **PCD**; work is tracked in Jira project **TP**.

| Confluence page | What it governs |
| --- | --- |
| 04 Prototype Specification | Screens, role access, acceptance criteria, calculation rules, management KPI set |
| 05 Demo Storyline & Pitch Run Sheet | The 9-step demo the app must support, in order |
| 06 Dummy Data Specification | Every number the app shows |

**Building the rest:** follow `BUILD_PROMPT.md` (the complete brief for Cursor, with paste-in messages per phase in Appendix A).

## Run it

1. Install Node.js 20 or newer.
2. In this folder: `npm install`
3. `npm run dev`, then open http://localhost:5173
4. `npm run verify` checks the generated data against page 06 (must say ALL CHECKS PASSED).

Deploy to Vercel: framework **Vite**, build command `npm run build`, output folder `dist`. No environment variables.

`npm run build:single` makes one self-contained HTML file (`artifact/pkns-asset-marketing-hub.html`). Keep it as the offline fallback copy on the presenting laptop.

## How it is put together

```
src/
  data/config.js     Fixed inputs copied from page 06: assets, campaigns by channel, signed tenancies, hero enquiry, social, website
  data/generate.js   Builds the full data set from config.js with a fixed seed (same output on every load): 838 units, daily campaign data, 120 enquiries, website, social, visitors
  data/metrics.js    The ONLY place calculations live: CPL, cost per viewing, cost per signed, ROAS, occupancy, WALE, expiry profile, days vacant, response time
  data/rng.js        Seeded random numbers and an exact-split helper (parts always add back to the total)
  store.jsx          Role, screen access matrix (page 04 §3) and live demo state (hero stage, stage moves, notes, SITC added), kept for the browser session
  router.js          Hash routes (#/portfolio, #/campaign/sa …) so a reload keeps the presenter's place
  format.js          Number, RM, % and ROAS formatting (rounds half up)
  components/Shell.jsx  Header, role switcher, navigation, footer, Reset demo (also Alt+Shift+R)
  screens/           Login, Placeholder, DataCheck (#/data-check, internal reconciliation view)
scripts/verify.mjs   Reconciliation test against page 06
```

To add a screen: create `src/screens/Portfolio.jsx` (etc.), then register it in the `BUILT` map in `src/App.jsx` under its screen id from `SCREENS` in `store.jsx`.

### The hero enquiry (storyline steps 4–6)

`state.heroStage` moves through `New → Contacted → Qualified → Viewing Scheduled → Negotiation → Signed`. Pass it to the metrics functions and every figure updates on its own:

- `campaignChannels(campaign, data.signed, range, heroStage)` adds +1 enquiry, +1 viewing (from Viewing Scheduled) and +1 signed with RM40,320 first-year rent (at Signed) to SA Sentral, Facebook lead ads.
- `statusCounts(units, heroStage)` and `unitStatus(unit, heroStage)` move suite 4-07 Vacant → Reserved (Negotiation) → Occupied (Signed).

Expected results are on page 06 §4 ("SA Sentral after the hero enquiry is signed") and are checked by `npm run verify`.

## Status (20 Oct)

| Jira | Story | State |
| --- | --- | --- |
| TP-26 | 2.1 Brand and UI shell | Built, in review |
| TP-27 | 2.2 Dummy data and calculation rules | Built; monthly spread of small counts fixed and leasing by month added (20 Oct); contact logs per enquiry in BUILD_PROMPT Phase 0 |
| TP-28 | 2.3 Setup, hosting, reset | App and reset built; Vercel hosting by Bharg after local development |
| TP-29 … TP-34 | 3.1–3.6 Core screens and end-to-end flow (M1, Fri 23 Oct) | Next: BUILD_PROMPT Phases 0–1 |
| TP-35 … TP-41 | 4.1–4.7 Dry-run screens (M2, Mon 26 Oct) | Login and role views done; rest to build |

## Rules for anyone building on this

- Every number shown must come from `generate.js` through `metrics.js`. Never type a figure into a screen.
- If you change `config.js` or `generate.js`, run `npm run verify` and update page 06 if a figure moves.
- Raw numbers with sorting and filtering. No scores, health ratings or red/amber/green colouring (spec G8).
- Keep the "Demo data" tag on every screen and CDS branding only in the footer.
- Campaign, ad and post names stay in Bahasa Malaysia; the interface is English.
- Design for a 1920×1080 screen share: body text at least 16px, headline figures at least 32px.
