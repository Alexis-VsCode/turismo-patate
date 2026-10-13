# Visitor Statistics · Patate Canton

[![Publish dashboard](https://github.com/Alexis-VsCode/turismo-patate/actions/workflows/publicar.yml/badge.svg)](https://github.com/Alexis-VsCode/turismo-patate/actions/workflows/publicar.yml)
[![Live site](https://img.shields.io/badge/demo-live-30A848)](https://alexis-vscode.github.io/turismo-patate/)
![License](https://img.shields.io/badge/license-all%20rights%20reserved-17752e)

> [Versión en español](README.md)

Public dashboard for the **Municipal Government of San Cristóbal de Patate (Ecuador)** showing visitor
statistics for the canton's tourism businesses. Each business fills in a shared spreadsheet and the dashboard
refreshes itself, with no servers of its own and no paid licenses.

**Who it is for.** Residents and visitors, who read the open dashboard; the businesses, who only fill in their
own tab of the spreadsheet; and the municipality's tourism team, which links it from its website and uses it to
report. Each one's walkthrough is in the [use cases](docs/casos-de-uso.md) (Spanish).

**[Live demo](https://alexis-vscode.github.io/turismo-patate/)** (the interface is in Spanish) ·
[Documentation](docs/README.md) · [Operations manual](docs/operacion.md) (Spanish)

## Preview

| Light mode | Dark mode |
|---|---|
| [![Desktop, light mode](docs/capturas/escritorio.jpg)](docs/capturas/escritorio.jpg) | [![Desktop, dark mode](docs/capturas/escritorio-oscuro.jpg)](docs/capturas/escritorio-oscuro.jpg) |

| Phone, light | Phone, dark | Phone, map |
|---|---|---|
| <a href="docs/capturas/celular.jpg"><img src="docs/capturas/celular.jpg" width="200" alt="Phone view, light mode"></a> | <a href="docs/capturas/celular-oscuro.jpg"><img src="docs/capturas/celular-oscuro.jpg" width="200" alt="Phone view, dark mode"></a> | <a href="docs/capturas/celular-mapa.jpg"><img src="docs/capturas/celular-mapa.jpg" width="200" alt="Origin map on a phone"></a> |

## The problem

The municipality needed to publish how many people visit its restaurants, inns and attractions, where they
come from, why they come, and their age and gender. The requirements were:
- **Simple data entry:** each business records its visitors in its own tab of a Google Sheet, using
  dropdowns.
- **Automatic onboarding:** a new tab automatically becomes a new business, with no code changes.
- **Public and free:** the dashboard is linked from the municipal website, works on phones and needs no
  Power BI Pro license.
- **Secure:** the spreadsheet is never exposed; the site publishes only aggregated, validated data.

## Features

- **Indicators:** total visitors with the **change against the same period of the previous year** (▲ or ▼).
  Figures animate when filtering.
- **Nationals vs foreigners:** a donut chart with the total in the center, the figures and percentages of each
  group, and a sentence that is worded according to the filters ("… during 2025", "… in March 2025").
- **Charts:**
  - monthly evolution comparing two years, with a trend line;
  - visit reasons with an icon, a bar, a figure and a percentage;
  - distribution by age (0-30, 31-45, 46-60 and 61+) with **Total women** and **Total men**, their figures and percentages;
  - **people with disabilities**: the total, its share of visitors and how many monthly records fall in each range
    (1 to 5, 6 to 10, 11 to 15 and 16 or more; the last one appears only if there are records). It is published only as an aggregate figure and is not crossed with age or gender.
- **Real map** (OpenStreetMap + Leaflet) with three tabs: **Provinces**, **Cities** and **Countries**. Each tab
  changes the bubbles, the "Top" list and the framing, and stays in sync with the Country / City filter.
- **Filters:**
  - **several options at once** for business, country / city / province, reason, age and gender, with type-ahead search;
    year and month stay single-choice;
  - **origin:** the combos list only the origins that have visitors in the data. The full catalog (about 450
    entries) is used to validate records and place them on the map;
  - options inside one filter are added together and different filters are intersected;
  - **cross-filtering** by clicking the charts, the reasons list and the map;
  - **active-filter tags** above the charts, removed one by one or all at once, which filter the whole dashboard.
- **Shareable link:** the page address reproduces the filters in use (several countries, a year, a reason...); the "Copiar enlace" button copies it and
  whoever opens it sees the same thing. A hand-edited link is validated and anything invalid is dropped.
- **Printing and accessibility:** controls are hidden when printing so the dashboard fits one sheet; there is a skip-to-content link, the participation sentence is
  announced when it changes, and a preview image is provided when the address is shared.
- **Refresh and freshness:** the site is published every 30 minutes (`PUBLICACION_MINUTOS`). The browser fetches
  on load, with the "Actualizar" button and automatically every 10 minutes (`INTERVALO_AUTO_MS`) while the tab is
  visible. The status bar shows four figures, each with a short explanation beneath it: **Última publicación** ("Datos nuevos cada 30
  minutos", new data every 30 minutes), **Periodo con datos** (the first and last month loaded, e.g. "dic 2024 a sep 2026"), **Establecimientos con
  datos** (businesses with at least one month recorded) and **Registros mensuales** (each one: a month, an origin and a reason). The browser's
  fetch time is no longer shown. A chip tells whether publishing is up to date, delayed or stopped. On medium screens (860 to 1279 px, including a
  phone's desktop mode, around 980 px) the bar is arranged in two rows: chip and buttons on top, the four figures below.
- **Data quality:** invalid rows are never dropped silently; they are listed with their tab and row.
- **Header and footer:** the header carries the institutional identity and the place. The footer, with an "Acerca del dashboard" column, explains what
  the dashboard is, its privacy and security, and its sources and licenses; it thanks the municipality and
  introduces, with their role written out, the municipality's contact and the author, with their photos (initials as a fallback if a photo does not load). If a social link of the
  contact is not published yet, its button reads "Pronto" ("soon") and opens a notice with the other links. The footer ends with the rights line:
  the author and year, that the data belongs to the GAD Municipal de San Cristóbal de Patate and the canton's establishments, and that the photos are published with each person's permission.
- **Responsive design:** on phones it is a single column, with a floating "Filtros" button that opens a bottom
  sheet; no horizontal scrolling.
- **Light and dark mode:** the site opens in light mode by default, without following the system theme. The moon button switches to dark and that choice is remembered on the device.

## How it works

```mermaid
flowchart LR
    A[Businesses<br/>one tab each] -->|fill in| B[(Google Sheet<br/>published as xlsx)]
    CJ[cron-job.org<br/>:00 and :30<br/>workflow_dispatch] --> F
    GS[GitHub schedule<br/>:15 and :45] --> F
    subgraph F[Publicar dashboard workflow]
        direction LR
        X[destrabar<br/>cancels runs stuck<br/>for over 25 min]
        C[construir<br/>downloads the xlsx with SHEET_URL,<br/>validates and builds datos.json]
        D[desplegar<br/>GitHub Pages]
        X --> D
        C --> D
    end
    B -.->|download| C
    D --> E[Visitor's browser<br/>reads only datos.json]
```

Publishing has two independent triggers, offset by 15 minutes, and both run the same workflow
(`.github/workflows/publicar.yml`):

| Trigger | When | Purpose |
|---|---|---|
| cron-job.org, via `workflow_dispatch` | Every 30 minutes, at minute 00 and 30 | Primary trigger |
| GitHub `schedule` (`15,45 * * * *`) | Every 30 minutes, at minute 15 and 45 | Backup: if one fails, the other publishes within 15 minutes or less |

The `destrabar` job ("unstick") runs at the start of every run and cancels runs of the workflow that have been
waiting or in progress for more than 25 minutes, so a stuck Pages deployment cannot hold the concurrency lock and
stop everything else; if a run is still active after twice that time (50 minutes), it force-cancels it. On every publication it also calls
`PUT /actions/workflows/{id}/enable`, which keeps the workflow active and resets GitHub's 60-day clock (event `flujo_mantenido`). If it fails,
publishing carries on anyway. The reasoning is in
[decision 009](docs/decisiones/009-publicacion-con-doble-disparador.md) (Spanish).

The spreadsheet URL **never** reaches the code or the site: it lives as an encrypted GitHub secret
(`SHEET_URL`) and only the scheduled job uses it. Details in [docs/configuracion.md](docs/configuracion.md)
(Spanish).

## About the project

This dashboard started from a concrete need of the Municipal Government of Patate: tourism businesses were
already recording their visitors, but that data reached nobody. I set out to publish it without licenses or
servers, and so that anyone at the municipality could add a business just by duplicating a tab.

The decisions that taught me the most:
- **Hiding the source without a backend.** The spreadsheet URL lives as a GitHub Actions secret and the site
  only publishes data that has already been validated.
- **Measuring instead of assuming.** Every figure on the dashboard is reconciled against an independent
  calculation in Python, so a formula error never reaches production.
- **Not claiming what is not verified.** If automatic publishing stops, the site does not
  keep saying "live": a chip says so.
- **Designing for phones first.** Most visits to the municipal website come from a phone.

The alternatives I discarded, and why, are in the [design decisions](docs/decisiones/) (Spanish).

## Observability

**Basic** observability, sized for a static site:
- **Data freshness:** the age of the publication is computed by a pure function and shown in a chip with text
  and color. The thresholds are in `UMBRALES_FRESCURA`: **"Datos al día"** (up to date) through minute 45,
  **"Datos con retraso"** (delayed) from minute 46 to 100, and **"Publicación detenida"** (stopped) from minute 101. They cover one
  30-minute cycle plus Actions delay, and tolerate losing one full cycle before calling publishing stopped.
- **Cadence:** publication every 30 minutes (`PUBLICACION_MINUTOS`) and a browser fetch every 10
  (`INTERVALO_AUTO_MS`).
- **Every publication leaves a trace:** the data builder writes a JSON log line and a summary in the
  **Actions** tab, with counts and durations, never tab names.
- **Unsticking and keep-alive:** the `destrabar` job cancels stuck runs (`destrabar_fin`) and keeps the workflow active (`flujo_mantenido`).
- **If the chip is not green:** first check the repository's **Actions** tab and that the cron-job.org task is
  still active. After 60 days without activity GitHub disables the whole workflow, so cron-job.org's trigger fails too;
  `destrabar` prevents this by re-enabling the workflow on every publication. If it still shows as disabled, re-enable it by hand under **Actions →
  Publicar dashboard → "Enable workflow"**. The step-by-step is in the runbook.
- **Stated limit:** the chip is seen by visitors; alerting whoever operates the site depends on GitHub's
  notifications for a failed workflow.

Details, thresholds and what to do when the chip is not green: [docs/observabilidad.md](docs/observabilidad.md)
(Spanish).

## Stack

| Layer | Technology |
|---|---|
| Interface | HTML, CSS and JavaScript (ES modules), no framework and no build step |
| Charts | Apache ECharts 6.1.0 |
| Map | Leaflet 1.9.4 + OpenStreetMap tiles + geoBoundaries province limits (CC0); geoBoundaries canton catalog (CC BY 3.0 IGO) and mledoze/countries (ODbL) |
| Excel reading | SheetJS 0.20.3, only inside GitHub Actions |
| Publishing | GitHub Actions (triggered by cron-job.org and by `schedule`, every 30 min) + GitHub Pages |
| Testing | `node:test` (Node 22) and an independent Python/openpyxl oracle |

## Architecture

The code follows a **semi-hexagonal architecture**. A test enforces that no layer depends on one it should not.

| Layer | Folder | Responsibility |
|---|---|---|
| Domain | [`src/domain/`](src/domain) | Pure rules: visitor normalization, catalog, statistics and freshness |
| Infrastructure | [`src/infrastructure/`](src/infrastructure) | Configuration, bounded download, `datos.json` contract and Excel reading |
| Facade | [`src/application/tablero.facade.js`](src/application/tablero.facade.js) | State, filters, refresh policy and computed view, no DOM |
| Container | [`src/application/components/tablero.container.js`](src/application/components/tablero.container.js) | Connects the page to the facade |
| Presentational | [`src/application/components/presentational/`](src/application/components/presentational) | Charts, map, reasons, cards and notices, stateless |
| Shared | [`src/shared/`](src/shared) | Texts, formatting and theme logic |
| Composition root | [`src/main.js`](src/main.js) | Wires infrastructure, facade and container, and traces the whole flow |

More in [docs/arquitectura.md](docs/arquitectura.md) and in the [design decisions](docs/decisiones/) (Spanish).

## Security

- **Libraries:** pinned versions with no known CVEs at review time. ECharts 6.1.0 fixes CVE-2026-45249 and
  SheetJS 0.20.3 fixes CVE-2023-30533 and CVE-2024-22363.
- **Integrity (SRI):** every external script carries its `integrity` hash.
- **CSP:** a strict policy with `connect-src 'self'`, no inline scripts and no `eval`.
- **Spreadsheet content:** treated as untrusted input. It is written with `textContent` or the DOM API,
  protected against prototype pollution, and the download is bounded in size and time.
- **Privacy:** no cookies and no tracking. The only thing stored on the device is the theme choice, and it is
  never sent anywhere.

Details in [docs/seguridad.md](docs/seguridad.md) (Spanish). To report a vulnerability, see
[SECURITY.md](SECURITY.md).

## Tests

They run on every `push` to `main` (a step with `if: github.event_name == 'push'`), and a push with a red test is not published. They do not run on
every scheduled publication:

| Folder | What it tests |
|---|---|
| [`test/domain/`](test/domain) | The filter scenarios (totals, series and year-over-year change) reconcile **exactly** with an independent Python oracle ([`tools/oraculo.py`](tools/oraculo.py)) over the real workbook. Also data freshness |
| [`test/infrastructure/`](test/infrastructure) | Normalization of real-world typos (`agosoto`, spaces, accents), rejected rows with their location, the `datos.json` contract, hostile HTML, `__proto__` and bounded download |
| [`test/application/`](test/application) | Facade with a simulated clock (reuse, automatic refresh, data kept on errors, map tabs, period texts) and the chart options |
| [`test/shared/`](test/shared) | Number and date formatting, filter-dependent texts and the theme, including the script that prevents flicker |
| [`test/tools/`](test/tools) | The `destrabar` job: which runs count as stuck and which get cancelled |
| [`test/sin-azul.test.mjs`](test/sin-azul.test.mjs) | No blue color in styles, HTML or code, except the Ecuador flag and the official LinkedIn and Facebook colors |
| [`test/arquitectura.test.mjs`](test/arquitectura.test.mjs) | Dependency rule between layers |
| [`test/tema-tokens.test.mjs`](test/tema-tokens.test.mjs) | Every color token in use exists, so no chart falls back to a default palette |

## Run locally

Requirements: Node 22 or later, and Python 3. The Python dependencies are needed only by the tools that use them:
`openpyxl` for the oracle and the test-data generator, and `xlsxwriter` for the capture workbook generator.

```bash
pip install openpyxl xlsxwriter
```

`package.json` scripts:

| Command | What it does |
|---|---|
| `npm test` | Runs all tests (`node --test "test/**/*.test.mjs"`) |
| `npm run datos` | Generates `datos/datos.json` from the test workbook `test/fixtures/piloto-publicado.xlsx` |
| `npm run oraculo` | Runs the independent Python oracle (`tools/oraculo.py`, needs `openpyxl`) and computes the expected figures |
| `npm run servir` | Starts the cache-free local server |

Python generators, run directly:

| Script | Dependency | Purpose |
|---|---|---|
| `python tools/generar-piloto.py` | `openpyxl` | Fictitious test workbooks |
| `python tools/excel/generar-excel.py --salida <file.xlsx>` | `xlsxwriter` | Capture workbook (`--modo completo` or `fixture`) |
| `python tools/catalogos/generar-catalogos.py` | standard library only | Canton and country catalogs (see `tools/catalogos/LEEME.md`) |

Common commands:

```bash
npm test
```

```bash
npm run datos
```

```bash
npm run servir
```

Then open `http://127.0.0.1:8765/`. `npm run datos` generates `datos/datos.json` from the test workbook in
[`test/fixtures/`](test/fixtures), and `npm run servir` starts a cache-free server so old modules are never mixed
with new styles. Since automatic publishing does not run locally, the freshness chip turns to
"Publicación detenida" (publishing stopped) 101 minutes after the data was generated; regenerate it with
`npm run datos`.

## Structure

```
├── index.html · css/tema.css
├── src/                      domain · infrastructure · application · shared · main.js
├── assets/                   logo, header photo, share image (og.jpg) and province limits
│   └── personas/             photos of the people behind the project (footer)
├── tools/
│   ├── construir-datos.mjs   datos.json builder (runs in Actions)
│   ├── destrabar-publicacion.mjs  cancels stuck runs
│   ├── oraculo.py · generar-piloto.py · servir.mjs
│   ├── excel/                capture workbook generator (generar-excel.py)
│   ├── catalogos/            generator and sources of the canton and country catalogs
│   └── vendor/               SheetJS, only for the builder
├── test/                     tests per layer and fixtures
├── docs/                     architecture, use cases, configuration, operations, observability, security,
│                             user manual (manual-usuario.md), decisions and screenshots
├── .github/
│   ├── workflows/            ci.yml and publicar.yml
│   └── dependabot.yml
└── LICENSE · CHANGELOG.md · CONTRIBUTING.md · SECURITY.md · THIRD_PARTY_NOTICES.md
```

## Documentation

The documents in `docs/` are written in Spanish, the language of the project's users.

- [Architecture](docs/arquitectura.md)
- [Use cases](docs/casos-de-uso.md)
- [Configuration](docs/configuracion.md)
- [User manual: how to read the dashboard](docs/manual-usuario.md)
- [Operations manual](docs/operacion.md)
- [Observability](docs/observabilidad.md)
- [Security](docs/seguridad.md) and [security policy](SECURITY.md)
- [Design decisions (ADR)](docs/decisiones/), in particular [009, publishing with a double trigger](docs/decisiones/009-publicacion-con-doble-disparador.md)
- [Contributing guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## People behind the project

| Person | Role |
|---|---|
| **Ing. Kevin Alexis Barrera Llerena** | Author. Design, development, publishing and monitoring (observability) of the dashboard. |
| **Lic. Vanessa Lesano** | Bachelor in Tourism. Contact and support at the Municipal Government of San Cristóbal de Patate. |

**Ing. Kevin Alexis Barrera Llerena**, Software Engineer.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-alexisbarreradesarrolador-0A66C2?logo=linkedin)](https://www.linkedin.com/in/alexisbarreradesarrolador/)
[![Facebook](https://img.shields.io/badge/Facebook-alexis.barrerallerena1804-1877F2?logo=facebook)](https://www.facebook.com/alexis.barrerallerena1804)
[![TikTok](https://img.shields.io/badge/TikTok-%40mancogamesam-000000?logo=tiktok)](https://www.tiktok.com/@mancogamesam)

**Lic. Vanessa Lesano**, municipality contact.

[![Facebook](https://img.shields.io/badge/Facebook-Vanessa%20Lesano-1877F2?logo=facebook)](https://www.facebook.com/vane.lesano.martinez)
[![TikTok](https://img.shields.io/badge/TikTok-%40vanelesano-000000?logo=tiktok)](https://www.tiktok.com/@vanelesano)
![LinkedIn](https://img.shields.io/badge/LinkedIn-coming%20soon-lightgrey?logo=linkedin)

## Acknowledgments

To the **Municipal Government of San Cristóbal de Patate** and **Lic. Vanessa Lesano**, for providing the
information from the tourism establishments and supporting the development of this dashboard.

## License

© 2026 Kevin Alexis Barrera Llerena. **All rights reserved.** The code is published for reference and
portfolio purposes; reuse requires the author's written permission (see [LICENSE](LICENSE)). Third-party
components keep their own licenses ([THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)). The data and the logo belong to the Municipal Government of San Cristóbal de Patate.

The site publishes the real data the municipality loads into its spreadsheet (`DATOS_DE_PRUEBA` is `false`). The
workbooks in [`test/fixtures/`](test/fixtures) and those generated by [`tools/generar-piloto.py`](tools/generar-piloto.py)
are **fictitious** and serve only for tests and local runs.
