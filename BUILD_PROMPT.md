# Build prompt: PKNS Asset Marketing Hub

**For:** Cursor (Agent mode) working in this repository
**Owner:** Bharg (Bhargava Adapa), CDS
**Written:** Tue 20 Oct 2026
**Pitch:** Wed 28 Oct 2026, 2:30pm, Google Meet (demo slot 15 minutes)

Read this file, `.cursorrules` and `README.md` in full before you write any code. Build in the phases in section 9, one phase per session, and stop at each checkpoint so Bharg can check the result.

---

## 1. What you are building and why

PKNS (Perbadanan Kemajuan Negeri Selangor), a Selangor state development corporation, owns and leases malls, office towers and shop lots. Today it runs campaigns on Facebook, Instagram and Google Ads, takes rental enquiries by WhatsApp and phone, and reports to management in Excel. It cannot answer one question: **which ringgit of marketing produced which tenancy?**

CDS is pitching to PKNS's marketing and strategy team. The pitch includes a **working prototype**, not slides. It has PKNS branding and dummy data, and it tells one story from start to finish:

> A Facebook lead ad produces an enquiry for office suite 4-07 at Kompleks PKNS Shah Alam. The enquiry lands in the leasing pipeline already tagged to its ad and campaign. The leasing officer works it through to a signed tenancy. The SA Sentral campaign's cost per lead and return on ad spend update on screen, and the suite turns from Vacant to Occupied on the asset view.

The prototype covers four modules. Screens are numbered as in the spec.

| Module | What it proves | Screens |
| --- | --- | --- |
| A. Marketing dashboard | Every channel in one place, with spend tied to results | 4, 5 |
| B. Enquiry management (CRM) | Every enquiry is captured, attributed and followed up | 6, 7 |
| C. Asset and unit management | Portfolio, lots and lease data, extendable through settings | 2, 3, 8 |
| D. Visitor counting (future phase) | Where footfall data will plug in | 9 |
| Management report | Proposed monthly reporting, based on researched industry standards | 10 |

**The audience decides what matters.** Nora (the PKNS marketing lead) ran the SA Sentral campaign and knows her numbers. If any figure fails to add up, the prototype loses credibility. So every figure must reconcile, and every screen must read clearly through a compressed Google Meet screen share.

### Source documents (Confluence space PCD)
- **Page 04, Prototype Specification:** screens, role access matrix, acceptance criteria, calculation rules and the KPI set. Sections 3–6 of this file restate it.
- **Page 05, Demo Storyline:** the 9 steps the app must support, in order. Section 8 restates it.
- **Page 06, Dummy Data Specification:** every figure. It is already encoded in `src/data/config.js`.

If this file conflicts with page 04 or 06, follow this file. Some decisions here are newer, and section 6.3 lists them.

---

## 2. What already exists (do not rebuild)

The foundation is built and tested. Extend it; do not replace it.

| File | What it does | Status |
| --- | --- | --- |
| `src/data/config.js` | Fixed inputs from page 06: 12 assets, 4 officers, 5 campaigns with channel totals, 25 signed tenancies, the hero record, social pages, top posts, website figures, leasing by month, pipeline stage counts | Done. Change only as instructed here |
| `src/data/generate.js` | Builds the full data set from config with a fixed seed, so every load is identical: 838 units, daily campaign data, 120 enquiries, website, social and visitors | Done. One addition needed (contact logs, Phase 0) |
| `src/data/rng.js` | Seeded random numbers; `allocate()` for exact proportional splits; `scatter()` for spreading small counts | Done |
| `src/data/metrics.js` | Every calculation: channel rows with ratios, totals, unit status, status counts, days vacant, leasing KPIs, response time, occupancy by month | Done. Extend it; never calculate in components |
| `src/store.jsx` | Roles, screen access matrix, live demo state (sessionStorage), reducer | Done. State shape changes in Phase 0 |
| `src/router.js` | Hash routes: `#/screen/param` | Done |
| `src/format.js` | `num`, `rm`, `rm2`, `pct`, `x`, `date`, rounding half up | Done |
| `src/components/Shell.jsx` | Header (logo, product name, Demo data tag, role switcher), side navigation filtered by role, footer with Reset demo (also Alt+Shift+R) | Done |
| `src/screens/Login.jsx` | Role selection screen (Screen 1) | Done |
| `src/screens/DataCheck.jsx` | Internal reconciliation view at `#/data-check` | Done |
| `scripts/verify.mjs` | Reconciliation test against page 06. `npm run verify` must print ALL CHECKS PASSED | Done. Extend it in every phase |
| `src/styles.css` | Design tokens (PKNS red #E31B23, charcoal #231F20, Source Sans 3, neutral data series --s1…--s6), layout, tables | Done. Add to it |

The generated data, as returned by `useStore().data`:

```
asAt: '2026-10-31'
months: [{ key: '2026-07', label: 'July 2026' }, … '2026-10']
assets: ASSETS (id, name, short, type, location, area, entity, grouping, officer, counts, mix, note?)
officers: { aina, hafiz, izzati, huda }
units[]: { id 'kpsa:4-07', asset, lot '4-07', floor, use, size, psf, rent, status,
           leaseStart?, leaseExpiry?, signedDate?, signedId?, trade?, vacantSince? }
signed[]: { id, campaign, channel, asset, use, rent, date, lot, unitId }
campaigns[]: config fields + { days[], daily: { fb|ig|gads|boost: { spend[], imp[], clicks[], enq[], views[], signed[] } },
           unpaidDaily: { 'Website form'[], 'Walk-in'[], Referral[] } }
enquiries[] (120): { id, business, contact, source, channel, campaign, asset, unitId, lot, rent, stage, officer,
           receivedAt, firstResponseAt, history: [[stage, iso]], nextFollowUp?, lostReason?, signedId? }
website: { days[], sessions[], monthly{}, usersMonthly{} }
social[]: SOCIAL_PAGES + { days[], reach[], monthlyReach{}, followersByMonth{} }
visitors: { days[], spend[] (SA Sentral daily spend), byAsset: { kpsa[], pas[] } of { date, total, main, car, side } }
```

The **hero enquiry is not in `data.enquiries`**. It exists only once the presenter presses "Simulate enquiry", and its stage is `state.heroStage`. `heroEffects()` in metrics.js already adds its effect on SA Sentral (Facebook lead ads) and on unit 4-07.

---

## 3. Rules that apply to every line of code

1. **No figure is typed into a screen.** Every number comes from `data` plus live state, through functions in `src/data/metrics.js` or the new `src/data/selectors.js`. If a screen needs a new number, add a function there first.
2. **One source per figure.** The Portfolio screen, Campaign view and Management report call the same functions, so they can never disagree.
3. **Live state flows everywhere.** The hero's stage, card moves, notes and added assets must update every screen without a reload. Pass `state` into selectors; do not copy figures into component state.
4. **Raw numbers only (spec G8).** No scores, health ratings, red/amber/green colouring, arrows coloured by "good" or "bad", or AI-written commentary on the data. Show the number, let people sort and filter. A change column shows the signed difference in neutral ink.
5. **Every table** has sortable columns (click header; arrow shows direction), right-aligned tabular numbers, a totals row where totals make sense, and an **Export to Excel** button (G10). Use the shared `DataTable` (Phase 0).
6. **Formatting** comes from `src/format.js` only. Currency is shown as `RM14,500`. CPL and cost per viewing or signed use two decimals; ROAS uses one decimal and an `x`; percentages use one decimal.
7. **Readability over Google Meet (G4):** designed for 1920×1080, and it must also work at 1440px wide. Body text at least 16px; headline figures at least 32px; table text at least 16px; no grey text lighter than `--muted`; no 1px chart lines (2px minimum); chart labels at least 14px.
8. **Branding (G1, G9):** PKNS logo and red lead. CDS appears only in the footer ("Prototype by Caspian Digital Solutions"). The "Demo data" tag stays visible on every screen.
9. **Language (G2):** the interface is in English. Campaign, ad and post names stay in Bahasa Malaysia exactly as written in config.js. Business names are fictional and in Malay.
10. **Dependencies:** add only the ones listed in section 7, with exact pinned versions (no `^`). No UI kits, CSS frameworks or state libraries.
11. After any change to `config.js`, `generate.js`, `rng.js`, `metrics.js` or `selectors.js`, run `npm run verify` and `npm run build`. Both must pass before you stop.
12. Do not change existing totals in config.js. If the generated data stops matching page 06, the code is wrong, not the spec.

---

## 4. Roles and navigation

Three roles, chosen at login and switchable from the header without losing demo state (already built).

| Screen | Route | Marketing | Leasing | Management |
| --- | --- | --- | --- | --- |
| 1 Login | `#/` | ✓ | ✓ | ✓ |
| 2 Portfolio overview | `#/portfolio` | ✓ | ✓ | ✓ **landing** |
| 3 Asset detail | `#/asset/<assetId>` (default `kpsa`) | ✓ | ✓ **landing** | ✓ |
| 4 Marketing dashboard | `#/marketing` | ✓ **landing** | — | ✓ |
| 5 Campaign view | `#/campaign/<campaignId>` (default `sa`) | ✓ | ✓ | ✓ |
| 6 Enquiry pipeline | `#/pipeline` | view only | ✓ edit | view only |
| 7 Enquiry detail | `#/enquiry/<enquiryId>` (not in nav) | view only | ✓ edit | view only |
| 8 Settings | `#/settings` | — | — | ✓ |
| 9 Visitors (future phase) | `#/visitors` | ✓ | — | ✓ |
| 10 Management report | `#/report` | ✓ | — | ✓ |

- `SCREENS` in `store.jsx` already holds this matrix. Add `enquiry` with `hidden: true` (not listed in the nav) and the same roles as `pipeline`.
- "View only" means no dragging, no stage changes, no notes and no reassigning. Edit controls are hidden, not disabled.
- Register each built screen in the `BUILT` map in `src/App.jsx`.

---

## 5. Phase 0 foundations (build these before any screen)

### 5.1 State shape (`src/store.jsx`)
Change the session key to `'pkns-hub-demo-v2'` so old stored state is dropped. New initial state:

```js
{
  role: null,
  heroStage: null,          // null | 'New' | 'Contacted' | 'Qualified' | 'Viewing Scheduled' | 'Negotiation' | 'Signed' | 'Lost'
  heroReceivedAt: null,     // ISO; set when "Simulate enquiry" is pressed: date = AS_AT, time = current wall-clock time (+08:00)
  heroLog: [],              // [{ stage, at }] stage changes
  heroSigned: null,         // { rent, start, term } captured in the Signed dialog
  moves: {},                // { [enquiryId]: { stage, at, lostReason?, rent?, start? } } for generated enquiries
  notes: {},                // { [enquiryId]: [{ type: 'Call'|'WhatsApp'|'Email'|'Viewing'|'Note', text, at, by }] }
  followUps: {},            // { [enquiryId]: 'YYYY-MM-DD' }
  officers: {},             // { [enquiryId]: officerId } reassignments
  customTypes: [],          // asset types added in Settings
  customAssets: [],         // assets added in Settings (SITC): { ...asset, spaces: [{ name, size, rate, basis, status }] }
  flash: 0,                 // increments on every live change; drives the highlight of changed figures
}
```

Reducer actions: `role`, `logout`, `simulateHero`, `heroStage` (payload: stage, plus `signed` or `lostReason` when relevant), `move` (id, stage, lostReason?, rent?, start?), `note` (id, note), `followUp`, `reassign`, `addType`, `addAsset`, `reset`. `reset` keeps the role and clears everything else. Replace the old `sitc` action with `addAsset`.

### 5.2 Live data selectors (`src/data/selectors.js`)
All screens read through these selectors. They combine generated data with live state and call metrics.js for the maths. Memoise each one in components with `useMemo` keyed on `data` and `state`.

| Selector | Returns |
| --- | --- |
| `liveAssets(data, state)` | `ASSETS` plus `state.customAssets` |
| `liveUnits(data, state)` | Units with live status: hero lot 4-07 via `heroEffects`; generated enquiries moved to Negotiation set their unit to Reserved, and moved to Signed set it to Occupied (with the confirmed rent, `leaseStart` = start date and `leaseExpiry` = start + 2 years − 1 day). When the hero is signed, unit 4-07 gets rent 3,360, `leaseStart` 2026-12-01 and `leaseExpiry` 2028-11-30, so WALE and the expiry profile include it |
| `liveEnquiries(data, state)` | The 120 records with `moves`, `notes`, `officers` and `followUps` applied, plus the hero record (built from `HERO`) when `heroStage` is set. Stage history includes live moves |
| `liveSigned(data, state)` | `data.signed`, plus the hero once signed (date `AS_AT`, channel fb, campaign sa, asset kpsa, rent from `heroSigned`), plus any generated paid enquiry moved to Signed (date `AS_AT`, its own campaign, channel and asset) |
| `campaignRows(data, state, campaignId, { from, to, channels?, assetId? })` | Channel rows with ratios. Uses `campaignChannels()`, and `liveSigned` for signed counts and first-year value. A live-signed generated enquiry adds +1 signed and its first-year value to its campaign and channel on `AS_AT` |
| `assetMarketing(data, state, assetId, range)` | Spend, paid enquiries, viewings, unpaid enquiries, signed, first-year value, CPL, ROAS for one asset. **Split rule:** for each campaign covering the asset, spend, paid enquiries, viewings and unpaid enquiries in the range are split across the campaign's assets with `allocate(total, weights)`, in the order of `campaign.assets`, so asset rows always add back to campaign totals exactly. Signed and first-year value come from the actual asset on each signed tenancy |
| `portfolioRows(data, state, month)` | One row per asset for Screen 2, plus the totals row (section 6.2) |
| `pipelineSummary(data, state, filters)` | Counts per stage, plus open pipeline value (sum of monthly asking rent for New to Negotiation) |
| `marketingSummary(data, state, filters)` | Everything Screen 4 needs, all from the same filtered selection |
| `reportBlocks(data, state, month)` | The three report blocks for this month and last month (section 6.10) |
| `contactLog(data, state, enquiryId)` | Generated log entries plus live notes, sorted by time |

**Which live moves count where (decision, 20 Oct):**
- Hero: exactly as `heroEffects()`. Received = +1 paid enquiry; Viewing Scheduled or later = +1 viewing; Signed = +1 signed with first-year value RM40,320. All are on SA Sentral, Facebook lead ads, dated `AS_AT`.
- Generated enquiries moved live: they change the board, unit status and pipeline counts. Only a move to **Signed** changes marketing figures (+1 signed, + first-year value), because their earlier stages are already counted in the campaign aggregates. A move to Lost changes only the board.

### 5.3 Contact logs (`src/data/generate.js`)
Page 04 Screen 7 needs a contact log for every enquiry. Add `buildContactLogs(enquiries)` and call it **last** in `generate()`, using its own random stream `makeRng(20261030)`. This keeps every other generated record unchanged. For each enquiry, write one entry per stage reached, timed at the history timestamps:

| Stage reached | Entry type | Example text (English; vary across 4–5 templates per stage) |
| --- | --- | --- |
| Contacted (at `firstResponseAt`) | Call or WhatsApp | "Called. Looking for about 1,200 sq ft; sent floor plan and rate card." |
| Qualified | Note | "Budget confirmed up to RM3,500 a month. Wants to move in Q1 2027." |
| Viewing Scheduled | Viewing | "Viewing booked for lot 4-07 on 12 Oct, 11am." |
| Negotiation | Email | "Sent offer letter at RM2.80 psf, 2-year term." |
| Signed | Note | "Tenancy agreement signed. Start 1 Nov 2026." |
| Lost | Note | "Lost: price. Prospect chose a unit in Seksyen 7." (use the record's `lostReason`) |

Store it on each record as `log: [{ type, text, at, by: officerId }]`. Do not change any other field.

### 5.4 Shared components (`src/components/`)

| Component | Behaviour |
| --- | --- |
| `DataTable` | Props: `columns` (key, label, align, format, sortValue, total: 'sum' or a function or null, filter: 'select' or 'text' or null), `rows`, `totals` (bool), `exportName`, `onRowClick`, `initialSort`. Sorts by any column; filter controls render above the table; totals row recomputes from the **filtered** rows (sum columns sum, ratio columns recompute from summed parts via a `total` function). The "Export to Excel" button writes the filtered, sorted rows with raw numbers (not formatted strings), a header row, and a first line "PKNS Asset Marketing Hub · Demo data · as at 31 Oct 2026" |
| `Num` | Shows a formatted value. When the value changes after first render, the cell gets a 2.5-second highlight (background `--red-tint`, fading). Use it for every figure the storyline changes |
| `Term` | Wraps a metric label. On hover or focus it shows the definition from `src/data/definitions.js` (name, formula, note) |
| `Kpi` | Label, a 32px or larger value through `Num`, optional sub-line (for example "of 688 lettable"). No colour judgement |
| `Filters` | A row of selects and date presets for asset, campaign, channel, officer and source. Range presets: October 2026 (default), September, August, July, Jul–Oct, Custom (two date inputs limited to 1 Jul to 31 Oct 2026) |
| `ExportButton` | Shared Excel writer used by `DataTable` and the report |
| `Modal` | Accessible dialog for the Signed, Lost and add-note actions |

### 5.5 Definitions (`src/data/definitions.js`)
One object, used by `Term`, the report's Definitions panel and the Excel Definitions sheet. Include every rule in section 6.1, each with `{ id, name, formula, source }`. ROAS must carry the note: "Demo assumption: first-year rental value of signed tenancies ÷ paid spend. PKNS's preferred definition to be confirmed."

### Phase 0 checkpoint
`npm run verify` and `npm run build` pass. `#/data-check` still renders. A temporary test confirms that `liveUnits`, `campaignRows` and `liveEnquiries` with `heroStage: 'Signed'` give the SA Sentral "after" figures in section 8.2.

---

## 6. Screen specifications

### 6.1 Calculation rules (page 04 section 5; already in metrics.js unless marked new)

| Metric | Rule |
| --- | --- |
| CPL | Paid spend ÷ paid enquiries |
| Cost per viewing | Paid spend ÷ viewings from paid enquiries |
| Cost per signed tenant | Paid spend ÷ signed tenancies from paid enquiries |
| ROAS | First-year rental value of signed tenancies ÷ paid spend (demo assumption) |
| Occupancy % | Occupied ÷ (total units − units under redevelopment). Event spaces are excluded entirely |
| First response time | First logged contact − enquiry received (median shown) |
| Enquiry-to-viewing / viewing-to-signed / enquiry-to-lease | Viewings ÷ enquiries / signed ÷ viewings / signed ÷ enquiries (paid) |
| Renewal rate | Leases renewed ÷ leases expiring in the month (`LEASING_BY_MONTH`) |
| Rental reversion | From `LEASING_BY_MONTH` |
| WALE | Σ(remaining years × monthly rent) ÷ Σ monthly rent, occupied units with leases |
| Lease expiry profile | Monthly rent expiring in Nov–Dec 2026 / 2027 / 2028 and later ÷ total contracted monthly rent |
| Days vacant | `AS_AT` − `vacantSince`, for Vacant and Reserved units (median shown) |
| Owned-to-paid ratio | Unpaid enquiries (website form, walk-in, referral) ÷ paid enquiries |
| **New:** Engagements (social page) | Organic reach × engagement rate, rounded |
| **New:** Follower change | `followersByMonth[month]` − previous month |
| **New:** New leases (month) | Count of `liveSigned` dated in that month |

Unpaid enquiries are shown but never included in CPL or ROAS.

### 6.2 Screen 2: Portfolio overview (Modules A, B, C) · Jira TP-29 · Phase 1
**Purpose:** "One view across every PKNS asset: what is empty, how long it has been empty, and what it cost to fill." This is storyline step 1 and the Management landing screen.

- Month selector (default October 2026).
- KPI row: assets, lettable units, occupied, vacant, occupancy %, paid enquiries (month), ad spend (month), CPL, ROAS, new leases (month), renewal rate (month).
- Asset table (`DataTable`), one row per asset. Columns: asset, type, location, managing entity, units, occupied, reserved, vacant, occupancy %, median days vacant, paid enquiries (month), open in pipeline (live count of New to Negotiation records for the asset), spend (month), CPL, signed (month), first-year rent (month), ROAS, rent expiring next 12 months (%). Filters: type, location (area). Sortable on every column. Totals row.
- SACC Mall row: status text "Under redevelopment"; occupancy "n/a"; excluded from occupancy maths. Its note (traders relocating, 112 of 150) shows as a footnote under the table.
- Clicking an asset name opens Screen 3. The SA Sentral campaign grouping shows as a link to `#/campaign/sa`.
- After SITC is added (Screen 8): the asset count becomes 13, SITC appears as a row (type Event space, units "3 spaces", occupancy "n/a, priced per day"), and a line under the totals reads "Event spaces: 3 (priced per day; not in occupancy)". Lettable units stay 838.

**Acceptance (October, before storyline):** 12 assets; 838 units; 549 occupied, 31 reserved, 108 vacant, 150 under redevelopment; occupancy 79.8%; spend RM34,206; paid enquiries 282; signed 9; first-year rent RM424,080; CPL RM121.30; ROAS 12.4x; new leases 9; renewal rate 65.4%. Asset rows sum to the totals. After the hero is signed, without a reload: paid enquiries 283; signed 10; first-year rent RM464,400; CPL RM120.87; ROAS 13.6x; occupied 550; vacant 107; occupancy 79.9%; new leases 10. Each changed figure flashes.

### 6.3 Screen 5: Campaign view, SA Sentral (Modules A, B) · Jira TP-30 · Phase 1 · **main screen**
**Purpose:** "This is the question management asks: which ringgit produced a tenant." Storyline steps 3 and 6.

- Campaign switcher (tabs or select) for all five campaigns. Default `sa`. Range presets as in `Filters`; default **full campaign period**, because the storyline figures are full-period.
- Header: campaign name (BM), period, assets covered (links), total spend, the managing area ("Section 14" for SA Sentral).
- Funnel (horizontal bars, neutral colour): impressions → clicks → paid enquiries → viewings → signed, with the step conversion shown between bars.
- Channel table: channel, spend, impressions, clicks, CTR, paid enquiries, CPL, viewings, cost per viewing, signed, cost per signed tenant, first-year rental value, ROAS. Totals row. CPL, cost per viewing, cost per signed and ROAS headers use `Term`.
- Chart (recharts): weekly spend (bars) against paid enquiries (line, second axis) across the campaign period. Weeks run Monday to Sunday; partial first and last weeks are labelled with their dates.
- Breakdown by asset (via `assetMarketing`): asset, spend, paid enquiries, viewings, signed, first-year value, CPL, ROAS. Totals equal the channel totals.
- Unpaid enquiries for the campaign, shown separately: website form, walk-in, referral, total, and the owned-to-paid ratio. They are not in CPL or ROAS.
- Recent enquiries: the 8 most recent live enquiries for this campaign (hero first when present), each opening Screen 7.

**Acceptance:** channel rows sum to campaign totals. Before the storyline (full period): 420 enquiries, 96 viewings, 14 signed, CPL RM114.29, cost per viewing RM500.00, cost per signed RM3,428.57, ROAS 12.6x. After the hero is signed: 421, 97, 15, RM114.01, RM494.85, RM3,200.00, 13.4x; the Facebook lead ads row goes from 210 / 41 / 6 to 211 / 42 / 7. Changed cells flash. Every campaign matches page 06 section 4.

### 6.4 Screen 6: Enquiry pipeline (Module B) · Jira TP-31 · Phase 1
**Purpose:** "No retyping, no lost WhatsApp. The enquiry knows which ad it came from." Storyline steps 4 and 5.

- Board columns: New, Contacted, Qualified, Viewing Scheduled, Negotiation, Signed, Lost. Each column header shows its count; the board header shows total open and open pipeline value (monthly asking rent, New to Negotiation).
- Card: business name; asset short name and lot; source icon (a simple inline SVG per source: Facebook, Instagram, Google, website, WhatsApp, walk-in) with the campaign short name; officer; days in stage; next follow-up date. The hero card carries a subtle "New" pulse for 5 seconds after it lands.
- Filters: asset, campaign, source, officer.
- Leasing role: drag cards between columns (native HTML5 drag and drop), with a "Move to…" menu on each card as a keyboard and screen-share-friendly alternative. Moving to Signed opens a dialog for confirmed monthly rent (prefilled with asking rent) and start date (prefilled 1 Dec 2026). Moving to Lost opens a dialog for the reason: Price, Size, Location, Timing, Other.
- "Simulate enquiry" button (Leasing role only, top right; also Alt+Shift+E) adds the hero enquiry. It does nothing if the hero already exists.
- Clicking a card opens Screen 7.

**Acceptance:** the hero appears in New within 2 seconds, tagged Facebook Lead Ad, campaign SA Sentral, asset Kompleks PKNS Shah Alam, lot 4-07, officer Aina Rahman. New goes from 18 to 19. Moving any card updates column counts, and moving to Negotiation or Signed updates Screens 2, 3, 5 and 10. View-only roles cannot move cards.

### 6.5 Screen 7: Enquiry detail (Module B) · Jira TP-32 · Phase 1
- Enquirer block: contact name, title, business, phone, email (fictional), preferred size, budget, contact channel.
- Attribution block: source, campaign (link to Screen 5), ad name (BM), received date and time.
- Unit block: asset (link to Screen 3), lot, use, size, asking rent (RM psf and RM per month), unit status (live).
- Stage history with timestamps, and first response time ("2 min", "3 h 25 min").
- Contact log (`contactLog`), newest first. Add-entry form (Leasing role): type (Call, WhatsApp, Email, Viewing, Note) and text. Adding the first entry on an enquiry that has none sets its first response time.
- Next follow-up (date input) and assigned officer (select), editable by Leasing.
- Stage control for Leasing: the same moves as the board, with the same dialogs.
- Hero record: from `HERO` in config.js (Encik Faizal Hamdan, Director, Teras Niaga Consulting Sdn Bhd, 012-388 4712, faizal@terasniaga.com.my; ad "Ruang Pejabat di SA Sentral – Sewa dari RM2.80 sk"; preferred 1,000–1,500 sq ft office; budget up to RM3,500 a month).

**Acceptance:** adding a note or scheduling a viewing updates the log here and the card on Screen 6. First response time is calculated from received time to the first logged contact.

### 6.6 Hero flow end to end · Jira TP-33 · Phase 1
This is the heart of the demo. It must work every time, in this order, with no reload:

1. Leasing → Pipeline → Simulate enquiry. Hero in New.
2. Open the card → log a Call ("Called Encik Faizal; wants 1,200 sq ft office, viewing this week") → stage Contacted. First response shows the real elapsed minutes.
3. Move to Qualified, then Viewing Scheduled (log a Viewing entry). SA Sentral viewings go from 96 to 97.
4. Move to Negotiation. Lot 4-07 shows Reserved on Screen 3.
5. Move to Signed: rent RM3,360, start 1 Dec 2026. Lot 4-07 Occupied; SA Sentral 421 / 97 / 15, CPL RM114.01, ROAS 13.4x; portfolio occupancy 79.9%.
6. Reset demo returns every figure to its starting value.

### 6.7 Screen 3: Asset detail (Modules C, D placeholder) · Jira TP-37 · Phase 2
- Asset selector (all live assets). Default Kompleks PKNS Shah Alam.
- Header facts: type, location, managing entity, campaign grouping, total units, net lettable area (sum of unit sizes in sq ft), occupancy, median days vacant, officer. An asset photo is optional: if `public/assets/<assetId>.jpg` exists, show it; otherwise use a plain panel with the asset name.
- Lot grid by floor (floors top to bottom): one tile per lot showing the lot number. Status colours are categorical, not judgemental: Occupied `--s2`, Reserved `--s4`, Vacant white with a 2px ink border, Under redevelopment grey hatched. The legend shows counts per status. Tiles are at least 44×32px. Clicking a tile selects the lot.
- Selected lot panel: lot facts, lease dates and rent (or days vacant), open enquiries for the lot (links to Screen 7), and the campaign promoting it.
- Lot table (`DataTable`): lot, floor, use, size, asking rent psf, asking rent per month, status, lease expiry, days vacant, open enquiries, campaign. Filters: floor, use, status, lease expiry window (≤3 months, 3–12 months, >12 months, none).
- Tabs: Lots (default), Enquiries for this asset (table), Campaigns for this asset (table, via `assetMarketing`), Visitors ("Future phase" placeholder that links to Screen 9 for the two malls).
- SITC (once added): no lot grid; a spaces table with space, size, rate, basis (per day) and status.

**Acceptance:** legend counts match the table. Lot 4-07 moves Vacant → Reserved → Occupied as the storyline progresses, with a flash.

### 6.8 Screen 4: Marketing dashboard (Module A) · Jira TP-36 · Phase 2
**Purpose:** "Your whole digital footprint in one place, and content decisions based on enquiries, not on likes." Storyline step 2 (2 minutes) is one of the screens this audience asked for, so give it the most visual polish.

- `Filters`: asset, campaign, channel, range (default October 2026). Every panel reads from `marketingSummary`.
- **Spend against results** (top row, `Kpi` tiles): spend, impressions, clicks, paid enquiries, CPL, viewings, signed, cost per signed tenant, ROAS.
- **Website panel:** sessions, users, traffic sources (horizontal bar, `WEBSITE_OCT.sources`; other months use the same mix applied with `allocate()` to that month's sessions), daily sessions line chart, top pages table (other months scale October's pages to the month's sessions with `allocate()`). The website is whole-site data: when an asset or campaign filter is active, the panel shows the label "Whole site · not filtered by asset or campaign".
- **Sample heatmap:** a mock of the pkns.gov.my "Property for rent" listing page built in SVG or CSS (header, search bar, six listing cards), with a translucent click-density overlay concentrated on the search bar, the first two cards and "Hubungi Kami". It is permanently labelled **"Sample"**. Do not use a screenshot of the real site.
- **Facebook and Instagram panel:**
  - **Organic:** page table: page, platform, followers, follower change, organic reach, engagements, engagement rate. Asset filter: `kpsa-fb`→kpsa, `sacc-fb`→sacc, `pas-fb`/`pas-ig`→pas, `bangi-fb`→bangi, `mu-fb`→mu and mu2; the main PKNS pages always show.
  - **Paid (separate table):** Facebook lead ads, Instagram ads and boosted posts from campaign data: spend, impressions, clicks, paid enquiries, CPL.
  - Organic and paid are never added together without a label.
  - Top posts table (`TOP_POSTS`): caption (BM), channel, type, reach, engagements, link clicks, boosted spend.
- **Google Ads panel:** spend, impressions, clicks, CTR, CPC, conversions (paid enquiries), cost per conversion; campaign table with the same columns.

**Acceptance:** changing any filter updates every panel. October, all campaigns: Google Ads spend RM14,500, CTR 3.8%, CPC RM1.41. Main page followers 55,200 (Facebook) and 9,650 (Instagram). The heatmap is labelled Sample.

### 6.9 Screen 8: Settings (Module C) · Jira TP-38 · Phase 2
**Purpose:** "Malls and offices today; event spaces, land, residential and township assets through settings, without new development." Storyline step 8 (30 seconds).

- Asset types list: the distinct types in `ASSETS`, plus Event space, Land, Residential and Township, plus `customTypes`. An "Add type" input.
- Add asset form: name, type, location, managing entity, campaign grouping, officer, image (optional file input; preview only, held in memory). A repeatable "Spaces or units" section: name, size, rate (RM), basis (per month or per day), status.
- A "Fill SITC sample" button prefills from `SITC_TEMPLATE` (Hall A RM18,000 per day; Hall B RM11,000 per day; Meeting Room 1 RM1,200 per day; Section 14; PREC; SA Sentral; officer Aina Rahman). Save adds it to `customAssets` and shows a confirmation with a link to the portfolio.
- Existing assets list (read-only table) under the form.

**Acceptance:** SITC can be added in under 60 seconds with three spaces. It appears at once on Screen 2 (row and asset count), in the Screen 3 selector, and in the asset filters on Screens 4 and 6. Per-day spaces do not change occupancy or unit totals.

### 6.10 Screen 10: Management report · Jira TP-40 · Phase 2
**Purpose:** "You asked what good reporting looks like. This is the industry-standard set, already filled from the system, and it still opens in Excel." Storyline step 7, and the answer to Nora's question 5. Do not cut it.

- Month selector (default October 2026). Each measure shows this month, last month and the change. For July, last month shows "–".
- **Block 1, Portfolio and leasing:** occupancy (month end; use `occupancyAtMonthEnd` for past months and live status for October), vacant units, new leases, leases expiring, leases renewed, renewal rate, rental reversion, then **snapshot measures** (as at 31 Oct only; last month shows "Snapshot" and change is blank): median days vacant, WALE, lease expiry profile (three rows), rent expiring next 12 months, retail trade mix (six rows). Footfall and tenant sales psf are listed as "Future phase".
- **Block 2, Marketing to tenancy (all campaigns):** spend, paid enquiries, enquiries by source (Facebook lead ads, Instagram, Google Ads, boosted posts, website form, walk-in, referral), CPL, enquiry-to-viewing, viewing-to-signed, enquiry-to-lease, cost per signed tenant, first-year rental value, ROAS, median first response time (enquiry records received in the month, including the hero), owned-to-paid ratio.
- **Block 3, Digital reach:** website sessions, users and sources; followers and organic reach per page; total engagements; top post by reach.
- A "Definitions" panel (collapsible, open by default during the demo) listing every measure from `definitions.js` with formula and source, plus the benchmark note from page 04 section 6: residential references are indicative only and not shown as targets.
- **Export to Excel:** one sheet per block plus a Definitions sheet, raw numbers, and a header line with month and "Demo data".
- **Export to PDF:** one A4 landscape page with the PKNS logo, month, the three blocks in compact tables, "Demo data · Prototype by Caspian Digital Solutions" in the footer. Use jsPDF with jspdf-autotable and keep it to one page.

**Acceptance:** every figure equals the same figure on Screens 2, 4 and 5 (same selectors). October Block 2 before the storyline: spend RM34,206; paid enquiries 282; CPL RM121.30; signed 9; ROAS 12.4x. After the hero is signed: 283; RM120.87; 10; 13.6x. October Block 1: renewal rate 65.4% (34 of 52), reversion +4.2%, WALE 1.35 years, expiry 8.2% / 34.0% / 57.8%, rent expiring next 12 months 36.9%, median days vacant 135 (before the storyline). The PDF is one page; the Excel file has four sheets.

### 6.11 Screen 9: Visitor view (Module D, future phase) · Jira TP-39 · Phase 2
**Purpose:** "When PKNS installs visitor counting, the last piece of the return-on-investment picture plugs in here." Storyline step 9 (30 seconds; dropped first if time is short).

- Permanent banner at the top: "Future phase: connects to PKNS's visitor counting system when installed. Figures below are illustrative."
- Asset select: Kompleks PKNS Shah Alam, Plaza Alam Sentral. Range presets.
- Chart: daily visitors (line) with SA Sentral daily spend (bars, second axis). Weekends are visibly higher.
- Entrance breakdown table: Main, Car park, Side, total, share %.
- KPI tiles: average weekday visitors, average weekend visitors, total visitors in range.

**Acceptance:** the banner is always visible; the numbers come from `data.visitors`.

### 6.12 Optional: QR live enquiry · Jira TP-41 · Phase 4 (**only if decision P5 on Fri 23 Oct is "go"**)
- A public route `#/qr` (no role needed) with a mobile form: name, business, space type, asset (select), phone. It carries a "Demo: please use made-up details" note.
- A QR code (qrcode.react, at least 300×300px) on the pipeline screen (presenter toggle) pointing at `<hosted URL>/#/qr`.
- Submissions go to a small shared store, polled every 2 seconds by the pipeline screen. Use Supabase (a free project, one table `qr_enquiries`, anon role insert-only plus select of the last 2 hours, row-level security on) with keys in Vercel environment variables. Bharg sets up the Supabase project and keys himself; write the code and a step-by-step setup note in README.
- New QR enquiries land in New tagged "Website form – QR demo", officer by asset.
- If the store is unreachable, nothing visible breaks; the presenter uses Simulate enquiry.

---

## 7. Dependencies to add (exact versions)

| Package | Version | Use |
| --- | --- | --- |
| `recharts` | `3.10.1` | Charts (Screens 4, 5, 9) |
| `xlsx` | `0.18.5` | Excel export (writing only; never parse uploaded files) |
| `jspdf` | `4.2.1` | Report PDF |
| `jspdf-autotable` | `5.0.8` | Report PDF tables |
| `@playwright/test` (dev) | `1.63.0` | Storyline test (section 10) |
| `qrcode.react` | `4.2.0` | Phase 4 only |

Install with `npm install --save-exact`. Nothing else.

---

## 8. The storyline the app must support (page 05)

### 8.1 Steps

| Step | Role | Screen | Action | Time |
| --- | --- | --- | --- | --- |
| 1 | Management | 2 Portfolio | Open October; sort by vacant units | 1 min |
| 2 | Marketing | 4 Marketing | Website sources and top pages, sample heatmap; Facebook and Instagram by page; organic vs paid; Google Ads | 2 min |
| 3 | Marketing → Management | 5 SA Sentral | Spend against enquiries, viewings and signed by channel; compare cost per signed (Google Ads vs Facebook) | 2 min |
| 4 | Leasing | 6 Pipeline | Simulate enquiry; hero lands in New, tagged | 1 min |
| 5 | Leasing | 7 → 6 | Log call, schedule viewing, Viewing Scheduled → Negotiation → Signed (RM3,360, 1 Dec 2026) | 1.5 min |
| 6 | Management | 5 → 2 | SA Sentral 421 / 15 / RM114.01 / 12.6x → 13.4x; 4-07 Occupied | 1 min |
| 7 | Management | 10 Report | Three blocks, Definitions, export Excel and PDF | 1.5 min |
| 8 | Management | 8 → 2 | Add SITC with three halls per day; appears on portfolio | 0.5 min |
| 9 | Marketing | 9 Visitors | Future phase view | 0.5 min |

Every screen change in the storyline is at most two clicks from the previous screen. Add direct links where needed (for example a "Back to campaign" link on Screen 7 for the hero, and a "View on portfolio" link after signing).

### 8.2 Expected figures (golden numbers)

| Figure | Before | After hero signed |
| --- | --- | --- |
| SA Sentral, full period: paid enquiries / viewings / signed | 420 / 96 / 14 | 421 / 97 / 15 |
| SA Sentral CPL / cost per viewing / cost per signed | RM114.29 / RM500.00 / RM3,428.57 | RM114.01 / RM494.85 / RM3,200.00 |
| SA Sentral first-year value / ROAS | RM604,800 / 12.6x | RM645,120 / 13.4x |
| SA Sentral, Facebook lead ads row (enq / views / signed) | 210 / 41 / 6 | 211 / 42 / 7 |
| All campaigns, full period: spend / enquiries / viewings / signed | RM92,000 / 772 / 169 / 25 | RM92,000 / 773 / 170 / 26 |
| All campaigns, full period: CPL / ROAS | RM119.17 / 12.3x | RM119.02 / 12.7x |
| All campaigns, October: spend / enquiries / viewings / signed | RM34,206 / 282 / 63 / 9 | RM34,206 / 283 / 64 / 10 |
| All campaigns, October: first-year value / CPL / ROAS | RM424,080 / RM121.30 / 12.4x | RM464,400 / RM120.87 / 13.6x |
| Google Ads, October: spend / CTR / CPC | RM14,500 / 3.8% / RM1.41 | unchanged |
| Portfolio units: occupied / reserved / vacant / redevelopment | 549 / 31 / 108 / 150 | 550 / 31 / 107 / 150 |
| Portfolio occupancy | 79.8% | 79.9% |
| During Negotiation (hero) | — | 549 / 32 / 107 / 150 |
| Pipeline: New / Signed | 18 / 9 | 18 / 10 (hero passes through New: 19 while there) |
| Leasing, October: renewal rate / reversion | 65.4% / +4.2% | unchanged |
| WALE / expiry profile / rent expiring next 12 months | 1.35 yrs / 8.2–34.0–57.8% / 36.9% | recomputed with lot 4-07 (verify prints it) |
| Median days vacant / median first response | 135 days / 3.5 h | recomputed (verify prints it) |

---

## 9. Phases, checkpoints and dates

Work one phase per Cursor session. At the end of each phase: run `npm run verify` and `npm run build`, run the app, and report to Bharg what was built, what was checked and anything that is not working. Do not start the next phase until he says so.

| Phase | Scope | Jira | Due |
| --- | --- | --- | --- |
| **0 Foundations** | Section 5: state v2, selectors, contact logs, shared components, definitions, dependencies | TP-27, TP-28 | Wed 21 Oct |
| **1 Core flow (Milestone 1)** | Screens 2, 5, 6, 7 and the hero flow (6.2–6.6) | TP-29 to TP-33 | Fri 23 Oct (review TP-34) |
| **2 Full screen set (Milestone 2)** | Screens 3, 4, 8, 9, 10 with exports (6.7–6.11) | TP-36 to TP-40 | Mon 26 Oct |
| **3 Presentation hardening** | Section 10: storyline test, 1920×1080 and 1440 checks, Reset, single-file offline copy, README update. Bharg deploys to Vercel | TP-28, TP-35 | Mon 26 Oct (dry run) |
| **4 Optional QR** | 6.12, only after a "go" on P5 | TP-41 | Mon 26 Oct |

The backup recording is made on Tue 27 Oct and the pitch is on Wed 28 Oct. No new features after the dry run, only fixes.

---

## 10. Verification

### 10.1 `scripts/verify.mjs` (extend in every phase)
Keep all existing checks. Add:
- Selector checks with live state: hero at each stage (New, Viewing Scheduled, Negotiation, Signed) gives the figures in 8.2.
- Portfolio rows (October) sum to portfolio totals for spend, paid enquiries, signed and first-year value. Asset rows of each campaign sum to the campaign totals.
- A generated paid enquiry moved to Signed adds exactly +1 signed and its rent × 12 to its campaign, channel and asset, and makes its unit Occupied.
- Adding SITC changes the asset count to 13 and leaves units, occupancy and campaign figures unchanged.
- Report Block 2 (October) equals the Screen 2 totals.
- Print the recomputed WALE, expiry profile, median days vacant and median first response after the hero is signed, so Bharg can add them to page 06.

### 10.2 Storyline test (`tests/storyline.spec.js`, `npm run e2e`)
A Playwright test that runs the storyline in a 1920×1080 browser and checks the visible figures: login as Management, check portfolio totals; switch to Leasing, simulate the hero, log a call, move it through the stages to Signed; check Screen 5 (421, 15, RM114.01, 13.4x), Screen 3 (4-07 Occupied) and Screen 2 (79.9%); add SITC; export the report (both downloads happen); Reset; check the starting figures are back. Use `data-testid` attributes for these checks. Add `"e2e": "playwright test"` to package.json, and note in README that `npx playwright install chromium` is needed once.

### 10.3 Manual checks before the dry run (Phase 3)
- Chrome at 1920×1080, 100% zoom, Google Meet "Present a tab": all text readable on a second laptop in the call.
- At 1440×900: no horizontal page scroll. Wide tables scroll inside their own container with the first column fixed.
- Reset demo (button and Alt+Shift+R) returns everything to the starting state, including added notes and SITC.
- Reload at any point keeps the presenter on the same screen and the same live state.
- `npm run build:single` gives one HTML file that runs the full storyline offline from the presenting laptop.
- No console errors on any screen.

---

## 11. Out of scope

- No backend, logins, passwords or real PKNS data (except the optional QR store).
- No connection to Meta, Google or any PKNS system. Do not imply live connections. The "Demo data" tag stays.
- No other agency names; the platform is presented as PKNS's own system.
- No pricing, timelines or scope commitments anywhere in the app.
- Do not touch the Pollen Track codebase or reuse its code.
- Do not invent new figures. If a screen needs a number that this file and config.js do not define, stop and ask Bharg.

---

## Appendix A. Messages to paste into Cursor, one per phase

**Phase 0**
> Read BUILD_PROMPT.md, .cursorrules and README.md in full. Do Phase 0 only (section 5): state v2, selectors.js, contact logs in generate.js, shared components, definitions.js and the dependencies in section 7 (not qrcode.react). Extend scripts/verify.mjs with the hero-stage selector checks. Run npm run verify and npm run build, then stop and tell me what you built and what passed.

**Phase 1**
> Continue from BUILD_PROMPT.md. Do Phase 1 only: Screens 2, 5, 6 and 7 and the hero flow (sections 6.2 to 6.6). Every figure from selectors. Check against the golden numbers in 8.2 and extend verify.mjs as in 10.1. Run verify and build, start the dev server, and stop with a list of what to click to check each acceptance criterion.

**Phase 2**
> Continue from BUILD_PROMPT.md. Do Phase 2 only: Screens 3, 4, 8, 9 and 10 with Excel and PDF export (sections 6.7 to 6.11). Same rules. Run verify and build, then stop with the acceptance checks for each screen.

**Phase 3**
> Continue from BUILD_PROMPT.md. Do Phase 3: write the Playwright storyline test (10.2), fix anything it finds, check the layout at 1920×1080 and 1440×900, confirm Reset and reload behaviour, run build:single, and update README with how to run, test and deploy. Stop and report.

**Phase 4 (only after a "go" on P5)**
> Continue from BUILD_PROMPT.md. Do Phase 4: the QR live enquiry (6.12) with Supabase. Write the code and a setup section in README that I can follow step by step. Stop and report.

**When something looks wrong**
> The [figure] on [screen] shows [X] but BUILD_PROMPT.md section 8.2 says [Y]. Find which selector produces it, fix the cause (not the display), add a check to verify.mjs, and run verify.
