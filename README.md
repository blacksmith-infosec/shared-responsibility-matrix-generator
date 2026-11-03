# Shared Responsibility Matrix Generator

[![CI](https://github.com/blacksmith-infosec/shared-responsibility-matrix-generator/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/blacksmith-infosec/shared-responsibility-matrix-generator/actions/workflows/ci.yml)
[![Line coverage](https://srm.blacksmithinfosec.com/coverage/line-coverage.svg)](https://srm.blacksmithinfosec.com/coverage/)
[![Branch coverage](https://srm.blacksmithinfosec.com/coverage/branch-coverage.svg)](https://srm.blacksmithinfosec.com/coverage/)
[![Node.js](https://img.shields.io/badge/Node.js-24.15.0-5FA04E?logo=nodedotjs&logoColor=white)](.nvmrc)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

Generate a one-page matrix showing how security responsibilities split between a vendor or platform provider, an MSP, and a client across the systems in the client's environment.

Built for MSPs, vCISOs, and auditors who need a clear starting point for client conversations and managed services agreements. Open source under Apache 2.0. Built and maintained by [Blacksmith InfoSec](https://blacksmithinfosec.com).

## What it does

- Add systems from a template or create a custom system.
- Set the system and vendor names, then choose which parties are involved in each of eight security categories.
- Preview the matrix as you edit, with optional client details and your MSP logo.
- Export PNG, landscape PDF, or CSV.
- Bookmark or share the current URL to restore the matrix later.
- Switch between light and dark themes while keeping the exported matrix on a white background.

Each responsibility cell shows one dot per party: vendor, MSP, and client. A filled dot means the party is involved; multiple filled dots mean shared responsibility. An empty cell means no party has been assigned. These are involvement indicators, not percentage allocations.

On narrow screens, scroll the matrix horizontally to reach every category. Keyboard users can focus the preview
and scroll with the arrow keys. PNG and PDF exports always include the complete matrix in a consistent layout,
regardless of the preview's width or scroll position. Screen readers can navigate its row and column headers and
read the assigned parties in each cell.

Template assignments are an opinionated starting point. Confirm the actual responsibility split in the managed services agreement and the relevant vendor documentation before treating the matrix as binding.

## Run locally

Use the Node.js version in `.nvmrc` and npm. If you use nvm:

```bash
nvm install
nvm use
npm ci
npm run start
```

Open `http://localhost:8081`. `npm run dev` starts the same development server.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run start` / `npm run dev` | Start Vite on port 8081 |
| `npm run lint` | Check TypeScript, JavaScript, React, and accessibility rules |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm test` | Run unit and component tests with coverage |
| `npm run test:watch` | Run tests while editing |
| `npm run build` | Check types and build the static site in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test:e2e` | Run browser behavior tests |
| `npm run test:visual` | Compare browser screenshots with visual references |
| `npm run coverage:prepare` | Add the latest coverage report and badges to an existing production build |

Install the browser before running browser tests:

```bash
npx playwright install chromium
npm run test:e2e
npm run test:visual
```

To use an existing Google Chrome installation, prefix the browser commands with `PLAYWRIGHT_CHROME_CHANNEL=chrome`.

To run the behavior tests against the production build, run `npm run build`, then
`PLAYWRIGHT_USE_PREVIEW=1 npm run test:e2e`. CI uses this mode to check the bundled application and exports.

Visual references are specific to the operating system and browser. The initial references were captured on macOS; CI runs the functional browser tests on Linux. Review new screenshots before accepting them. See [CONTRIBUTING.md](CONTRIBUTING.md) for the testing workflow.

ESLint 10 uses `@eslint/compat` for the React and accessibility plugins' older rule APIs. Their scoped peer-dependency
overrides allow ESLint 10 without bypassing peer checks for other packages. Remove the overrides and compatibility
wrappers when those plugins support ESLint 10 directly.

Builds and type checks use TypeScript 7.0.2 through the `@typescript/native` npm alias. The `typescript` dependency
aliases `@typescript/typescript6` to provide the compiler API required by `typescript-eslint`. This follows
[Microsoft's compatibility setup](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-60):
`tsc` runs TypeScript 7, while `tsc6` remains available for tools that need TypeScript 6.

### Coverage reports and badges

`npm test` enforces 80% minimum coverage for statements, branches, functions, and lines. It writes HTML, LCOV, and
JSON summary reports to `coverage/`. CI retains the reports as a `coverage-report` artifact and includes them in the
GitHub Pages deployment. The README's coverage badges show line and branch coverage from the latest deployed `main`
build and link to the full HTML report. They become available after the first deployment containing this setup;
pull requests produce artifacts without changing the published badges. No coverage service or token is required.

To preview the reports and badges locally:

```bash
npm test
npm run build
npm run coverage:prepare
npm run preview
```

Open `/coverage/` on the preview server. Rebuild the reports after changing code or tests. The CI badge requires
repository access while the repository is private.

## Project structure

- `src/main.tsx` mounts the React application.
- `src/components/` contains the UI, its styles, and component tests.
- `src/providers/` manages matrix state and theme preferences.
- `src/modules/` contains named domain helpers for responsibility assignments, URL state, and exports.
- `src/data/` contains the responsibility categories and system templates.
- `tests/` contains browser behavior and visual tests.

The application follows the React, TypeScript, Vite, Vitest, and ESLint conventions used in Blacksmith's other open source tools. The matrix styling and interaction model are preserved when changing the underlying implementation.

## Responsibility data

The matrix has eight responsibility columns plus System, for nine displayed columns. The vendor appears beneath the system name. CSV exports separate System and Vendor, for ten columns. The category definitions determine the responsibility columns; the system catalog provides template names, vendor names, and default assignments. A custom system starts without assignments.

Each assignment is an array of party codes: `v` for vendor or platform provider, `m` for MSP, and `c` for client. An empty array means no party is assigned. Updates to template defaults affect newly added systems; an existing matrix retains its selected assignments.

When proposing a template change, include the vendor's authoritative documentation and explain which responsibilities belong to the platform, the tenant, and the MSP. Avoid treating a vendor's platform security as ownership of tenant configuration or client data governance.

### Column definitions

| Responsibility column | Definition |
| --- | --- |
| Data classification | Identify data sensitivity, ownership, permitted use, handling, and retention requirements. |
| Identity access | Manage accounts, authentication policies, permissions, access approvals, and access reviews. |
| Endpoint protection | Configure and operate protection for client devices and guest operating systems, including malware prevention and endpoint detection. |
| Network controls | Configure and operate network security within the row's scope, including platform networks, client firewalls, segmentation, and DNS filtering. |
| App security & patching | Maintain the service or application, configure its security settings, and manage applicable software and firmware updates. |
| Backup recovery | Define recovery requirements, configure and operate applicable recovery mechanisms, verify recoverability, and perform restores within the row's scope. |
| Logging & monitoring | Generate, configure, retain, and review security logs and alerts. |
| Incident response support | Investigate, contain, and remediate incidents within agreed service scope. |

### Catalog and product references

The catalog focuses on client-facing systems in SMB environments. Product names and capabilities were checked against these official references on October 14, 2026. The Scope column states the licensing, configuration, and service assumptions behind each template's default dots.

| Template | Vendor | Scope |
| --- | --- | --- |
| [Microsoft 365](https://www.microsoft.com/en-us/microsoft-365/business) | Microsoft | Business Premium; Microsoft-managed keys; no Microsoft 365 Backup |
| [Microsoft Entra ID](https://www.microsoft.com/en-us/security/business/identity-access/microsoft-entra-id) | Microsoft | P1 with security defaults; no P2 risk policies |
| [Microsoft Azure](https://azure.microsoft.com/en-us) | Microsoft | VMs and platform services; platform-managed keys; no backup service selected |
| [Amazon Web Services (AWS)](https://aws.amazon.com/) | Amazon Web Services | EC2, VPC, S3; CloudTrail event history; no AWS Backup or GuardDuty |
| [Google Workspace](https://workspace.google.com/) | Google | Business Plus with Vault; no third-party backup |
| [Windows endpoints](https://www.microsoft.com/en-us/windows/business/) | Microsoft | Windows 11 Pro or Enterprise, Entra-joined, Intune-managed, Autopatch |
| [Fortinet FortiGate](https://www.fortinet.com/products/next-generation-firewall) | Fortinet | FortiOS 7.4 administered locally; FortiGuard web filtering |
| [Datto SIRIS](https://www.datto.com/products/siris/) | Datto | Appliance with Datto Cloud replication; screenshot verification on |
| [Salesforce Starter Suite](https://www.salesforce.com/small-business/starter/) | Salesforce | Native sign-in; no Backup and Recover add-on |
| [Microsoft Intune](https://learn.microsoft.com/en-us/intune/fundamentals/what-is-intune) | Microsoft | Plan 1 |
| [Microsoft Defender for Business](https://learn.microsoft.com/en-us/defender-business/mdb-overview) | Microsoft | Default policies; web content filtering enabled |
| [Huntress Managed EDR](https://www.huntress.com/platform/managed-edr) | Huntress | Managed EDR with Managed Microsoft Defender |
| [SentinelOne Singularity Complete](https://www.sentinelone.com/platform/singularity-complete/) | SentinelOne | Vendor-hosted console; no Vigilance or MDR |
| [SonicWall TZ Series](https://www.sonicwall.com/products/firewalls/entry-level) | SonicWall | SonicOS 7 administered locally; Capture ATP on |
| [UniFi Cloud Gateway](https://ui.com/cloud-gateways) | Ubiquiti | Site Manager remote management; cloud backups on |
| [DNSFilter](https://www.dnsfilter.com/use-case/protective-dns) | DNSFilter | MSP-managed dashboard and Roaming Clients |
| [Datto SaaS Protection](https://www.datto.com/products/saas-protection/) | Datto | Backs up Microsoft 365 and Google Workspace |
| [Cove Data Protection](https://www.n-able.com/products/cove-data-protection) | N-able | Servers, workstations, Microsoft 365; Fortified Copies on |
| [1Password Business](https://support.1password.com/explore/business/) | 1Password | Bought through the 1Password MSP program |
| [QuickBooks Online](https://quickbooks.intuit.com/online/) | Intuit | Plus or Essentials; MSP administers access only |
| [HubSpot Smart CRM](https://www.hubspot.com/products/crm/ai-crm) | HubSpot | Starter or Professional seats |
| [Slack](https://slack.com/trust/security) | Slack | Pro or Business+; default retention |
| [Zoom Workplace](https://www.zoom.com/en/products/collaboration-tools/) | Zoom | Pro or Business; cloud recording with Trash on |

### Boundary rules

The responsibility defaults are modeled starting points for a managed-client engagement. The vendor references establish product scope; the actual V/M/C split depends on the client's agreement, licensed features, and delegated access. Azure and AWS defaults assume MSP-managed workloads and need review for the specific services deployed.

Read each dot within the named row's scope. A filled dot indicates involvement, not that a control is configured, effective, or contractually guaranteed. Shared dots still need agreed ownership of specific tasks. An empty cell is unassigned and needs review; it does not establish that a control is unnecessary or not applicable.

Vendor participation covers platform security and explicitly contracted managed security services. Tenant configuration, user access, data governance, and security settings remain with the client or MSP unless explicitly delegated. A vendor dot under Network controls can cover the provider's service network or a delivered filtering service; it does not by itself assign operation of the client's firewall or local network.

Windows endpoints represents the device estate. Intune, endpoint security, DNS filtering, and backup products have separate rows for their own service scope; those rows do not imply complete device management. The backup rows cover recovery rather than endpoint threat protection, and EDR response or rollback does not provide general device backups. Huntress's template includes its managed SOC; SentinelOne Singularity Complete's template assumes MSP incident handling alongside vendor detection technology and automation. A separately purchased MDR service can change that allocation.

Logging & monitoring is separate from Incident response support. Generating logs or automated alerts does not imply staffed incident handling. Incident response support covers investigation, containment, and remediation within agreed service scope. Incident leadership, escalation, and decision authority are defined in the client's incident response plan. Defaults assign V/M/C to Microsoft Defender for Business and Huntress Managed EDR, M/C to the other IT-supported templates, and C to QuickBooks, whose application-specific response is client-coordinated. Review these assignments against contracted coverage and response authority; an unsupported application can still require containment in MSP-managed identity, endpoint, or network systems.

Firewall templates assume the MSP operates the client's appliance and manages rules, firmware, configuration backups, and monitoring. SaaS data ownership, access approvals, retention choices, and recovery requirements remain client decisions. QuickBooks defaults keep accounting operations with the client; MSP participation assumes delegated access support. The 1Password recovery category covers vault and account recovery.

Backup recovery applies to the row's data, workloads, configuration, or account access. A dot can assign responsibility for selecting and configuring a recovery approach even when no backup service is selected; it does not establish that a licensed, configured, and tested backup exists. Platform resilience, retention, and recovery features must be assessed separately against the client's recovery requirements.

Datto SaaS Protection is scoped to Microsoft 365 and Google Workspace. Cove's template models server, workstation, and Microsoft 365 backup; its Google Workspace offering is currently in public preview. Confirm workload coverage and restore procedures before relying on either template. Collaboration retention and service availability also need a separate recovery plan.

### Saved matrices and CSV exports

Renamed templates keep their existing IDs. Saved URLs preserve their authored names, vendors, and responsibility overrides; catalog changes affect newly added rows. Existing seven-category URLs leave Incident response support unassigned for review.

CSV exports include System and Vendor columns followed by the responsibility categories. Assignment cells contain `V`, `M`, and `C` in that order. Formula-like system and vendor text is prefixed with an apostrophe to prevent spreadsheet execution. CSV import is not currently supported.

## Privacy and saved matrices

Your matrix is saved in this page's link. Anyone with the full link can read it, including client names. Share it only with people who should see it.

There is no application backend. Client and MSP names, system names, vendors, and assignments are encoded in the URL fragment. Anyone with the complete URL can read and restore those values. Encoding is not encryption, so treat shared URLs and exported files as client information.

The uploaded MSP logo and theme preference are stored separately in this browser's localStorage. The logo is not included in a shared URL. Remove it with the logo's remove control or clear the site's browser storage.

The site loads fonts from Google Fonts. Application code and branding assets are bundled or served with the site. Following external links contacts the destination sites. See [SECURITY.md](SECURITY.md) for the security policy and disclosure contact.

## Build and deploy

```bash
npm ci
npm run build
npm run preview
```

Serve the generated `dist/` directory on any static host, including GitHub Pages, Cloudflare Pages, Netlify, or Vercel. No backend or environment variables are required. Vite uses relative asset paths so the build also works under a project subpath.

GitHub Actions runs lint, type checks, unit tests, the production build, and functional browser tests for pull requests and pushes to `main`. After all checks pass on `main`, the workflow uploads the tested `dist/` build and deploys it to GitHub Pages. Pull requests only run validation.

The proposed [main branch ruleset](.github/rulesets/main.json) requires the `verify` check from GitHub Actions before merging. It preserves the existing pull request, approval, deletion, and force-push rules. This is a GitHub REST update payload; committing the file does not apply it to repository settings.

Before applying it, compare the payload with the current [main ruleset](https://github.com/blacksmith-infosec/shared-responsibility-matrix-generator/rules/17762213), or inspect that ruleset using `gh api repos/blacksmith-infosec/shared-responsibility-matrix-generator/rulesets/17762213`. Reconcile any settings changed since the payload was prepared. An authenticated administrator can then apply the reviewed payload:

```bash
gh api --method PUT \
  --header 'X-GitHub-Api-Version: 2026-03-10' \
  repos/blacksmith-infosec/shared-responsibility-matrix-generator/rulesets/17762213 \
  --input .github/rulesets/main.json
```

After applying, confirm that **Settings → Rules → Rulesets → main** lists `verify` from GitHub Actions as a required status check. The payload targets this repository's existing ruleset; forks need their own repository path and ruleset ID.

The site is published at [srm.blacksmithinfosec.com](https://srm.blacksmithinfosec.com/). The repository's **Settings → Pages → Build and deployment → Source** must be set to **GitHub Actions**. Pushes to `main` deploy automatically; to redeploy manually, run **Lint, test, build, and deploy** from the Actions tab with the `main` branch selected. The `github-pages` environment and deployment job show the published site URL. An in-progress deployment finishes before the next `main` run starts.

## Contributing

Pull requests are welcome, especially for new system templates, corrections to responsibility defaults with supporting sources, accessibility improvements, and regression tests. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, coding standards, and review expectations.

Report general bugs and suggestions through [GitHub issues](https://github.com/blacksmith-infosec/shared-responsibility-matrix-generator/issues). Report unpatched security vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Related Blacksmith tools

- [Compliance Profile Generator](https://github.com/blacksmith-infosec/compliance-profile-generator)
- [Risk Assessment Tool](https://github.com/blacksmith-infosec/risk-assessments)

## License

Apache 2.0. See [LICENSE](LICENSE). Blacksmith names and logos are not licensed for use as your own branding.
