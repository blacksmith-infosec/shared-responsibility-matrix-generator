# Shared Responsibility Matrix Generator

Generate a one-page matrix showing how security responsibilities split between a vendor or platform provider, an MSP, and a client across the systems in the client's environment.

Built for MSPs, vCISOs, and auditors who need a clear starting point for client conversations and managed services agreements. Open source under Apache 2.0. Built and maintained by [Blacksmith InfoSec](https://blacksmithinfosec.com).

## What it does

- Add systems from a template or create a custom system.
- Set the system and vendor names, then choose which parties are involved in each of seven security categories.
- Preview the matrix as you edit, with optional client details and your MSP logo.
- Export PNG, landscape PDF, or CSV.
- Bookmark or share the current URL to restore the matrix later.
- Switch between light and dark themes while keeping the exported matrix on a white background.

Each responsibility cell shows one dot per party: vendor, MSP, and client. A filled dot means the party is involved; multiple filled dots mean shared responsibility. An empty cell means no party has been assigned. These are involvement indicators, not percentage allocations.

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

## Project structure

- `src/main.tsx` mounts the React application.
- `src/components/` contains the UI, its styles, and component tests.
- `src/providers/` manages matrix state and theme preferences.
- `src/modules/` contains named domain helpers for responsibility assignments, URL state, and exports.
- `src/data/` contains the responsibility categories and system templates.
- `tests/` contains browser behavior and visual tests.

The application follows the React, TypeScript, Vite, Vitest, and ESLint conventions used in Blacksmith's other open source tools. The matrix styling and interaction model are preserved when changing the underlying implementation.

## Responsibility data

The category definitions determine the seven matrix columns. The system catalog provides template names, vendor names, and default assignments. A custom system starts without assignments.

Each assignment is an array of party codes: `v` for vendor or platform provider, `m` for MSP, and `c` for client. An empty array means no party is involved. Updates to template defaults affect newly added systems; an existing matrix retains its selected assignments.

When proposing a template change, include the vendor's authoritative documentation and explain which responsibilities belong to the platform, the tenant, and the MSP. Avoid treating a vendor's platform security as ownership of tenant configuration or client data governance.

### Catalog and product references

The catalog focuses on client-facing systems in SMB environments. Product names and capabilities were checked against these official references on October 14, 2026.

| Template | Vendor | Scope |
| --- | --- | --- |
| [Microsoft 365](https://www.microsoft.com/en-us/microsoft-365/business) | Microsoft | Productivity tenant |
| [Microsoft Entra ID](https://www.microsoft.com/en-us/security/business/identity-access/microsoft-entra-id) | Microsoft | Identity and access |
| [Microsoft Azure](https://azure.microsoft.com/en-us) | Microsoft | Client cloud workloads |
| [Amazon Web Services (AWS)](https://aws.amazon.com/) | Amazon Web Services | Client cloud workloads |
| [Google Workspace](https://workspace.google.com/) | Google | Productivity tenant |
| [Windows endpoints](https://www.microsoft.com/en-us/windows/business/) | Microsoft | Managed client devices |
| [Fortinet FortiGate](https://www.fortinet.com/products/next-generation-firewall) | Fortinet | Local firewall |
| [Datto SIRIS](https://www.datto.com/products/siris/) | Datto | Backup and disaster recovery |
| [Salesforce Starter Suite](https://www.salesforce.com/small-business/starter/) | Salesforce | Small-business CRM |
| [Microsoft Intune](https://learn.microsoft.com/en-us/intune/fundamentals/what-is-intune) | Microsoft | Device and application management |
| [Microsoft Defender for Business](https://learn.microsoft.com/en-us/defender-business/mdb-overview) | Microsoft | Endpoint security |
| [Huntress Managed EDR](https://www.huntress.com/platform/managed-edr) | Huntress | Managed endpoint detection and response |
| [SentinelOne Singularity Complete](https://www.sentinelone.com/platform/singularity-complete/) | SentinelOne | Endpoint protection and EDR |
| [SonicWall TZ Series](https://www.sonicwall.com/products/firewalls/entry-level) | SonicWall | Local firewall |
| [UniFi Cloud Gateway](https://ui.com/cloud-gateways) | Ubiquiti | Gateway and local network management |
| [DNSFilter](https://www.dnsfilter.com/use-case/protective-dns) | DNSFilter | Protective DNS |
| [Datto SaaS Protection](https://www.datto.com/products/saas-protection/) | Datto | Microsoft 365 and Google Workspace backup |
| [Cove Data Protection](https://www.n-able.com/products/cove-data-protection) | N-able | Server, workstation, and Microsoft 365 backup |
| [1Password Business](https://support.1password.com/explore/business/) | 1Password | Business vaults and credential management |
| [QuickBooks Online](https://quickbooks.intuit.com/online/) | Intuit | Cloud accounting |
| [HubSpot Smart CRM](https://www.hubspot.com/products/crm/ai-crm) | HubSpot | Customer relationship management |
| [Slack](https://slack.com/trust/security) | Slack | Team collaboration |
| [Zoom Workplace](https://www.zoom.com/en/products/collaboration-tools/) | Zoom | Meetings and collaboration |

The responsibility defaults are modeled starting points for a managed-client engagement. The vendor references establish product scope; the actual V/M/C split depends on the client's agreement, licensed features, and delegated access. Azure and AWS defaults assume MSP-managed workloads and need review for the specific services deployed.

Windows endpoints represents the device estate. Intune and endpoint security products have separate rows for their own service scope. EDR response or rollback does not provide general device backups. Huntress's template includes its managed SOC; SentinelOne Singularity Complete's template assumes MSP incident handling alongside vendor detection technology and automation. A separately purchased MDR service can change that allocation.

Firewall templates assume the MSP operates the client's appliance and manages rules, firmware, configuration backups, and monitoring. SaaS data ownership, access approvals, retention choices, and recovery requirements remain client decisions. QuickBooks defaults keep accounting operations with the client; MSP participation assumes delegated access support. The 1Password recovery category covers vault and account recovery.

Datto SaaS Protection is scoped to Microsoft 365 and Google Workspace. Cove's template models server, workstation, and Microsoft 365 backup; its Google Workspace offering is currently in public preview. Confirm workload coverage and restore procedures before relying on either template. Collaboration retention and service availability also need a separate recovery plan.

Renamed templates keep their existing IDs. Saved URLs preserve their authored names, vendors, and responsibility overrides; catalog changes affect newly added rows.

CSV exports include System and Vendor columns followed by the responsibility categories. Assignment cells contain `V`, `M`, and `C` in that order. Formula-like system and vendor text is prefixed with an apostrophe to prevent spreadsheet execution. CSV import is not currently supported.

## Privacy and saved matrices

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

GitHub Actions runs lint, type checks, unit tests, the production build, and functional browser tests for pull requests and pushes to `main`. The included workflow validates changes; deployment is configured by the chosen host.

## Contributing

Pull requests are welcome, especially for new system templates, corrections to responsibility defaults with supporting sources, accessibility improvements, and regression tests. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, coding standards, and review expectations.

Report general bugs and suggestions through [GitHub issues](https://github.com/blacksmith-infosec/shared-responsibility-matrix-generator/issues). Report unpatched security vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Related Blacksmith tools

- [Compliance Profile Generator](https://github.com/blacksmith-infosec/compliance-profile-generator)
- [Risk Assessment Tool](https://github.com/blacksmith-infosec/risk-assessments)

## License

Apache 2.0. See [LICENSE](LICENSE). Blacksmith names and logos are not licensed for use as your own branding.
