# Shared Responsibility Matrix Generator

A free, open-source tool for MSPs to generate a one-page shared responsibility matrix showing how security responsibilities split between Cloud Provider, MSP, and Customer across the systems in a customer's environment.

Built and given away by [Blacksmith InfoSec](https://blacksmithinfosec.com).

## What it does

You input:

- Your customer's name
- Your MSP's name
- The systems in their environment, either from a template or built from scratch
- Per-system: vendor name and which parties (Vendor / MSP / Client) are involved in each of seven security categories

You get back:

- A clean one-page matrix showing who handles what across seven security categories
- Downloadable as PNG (for LinkedIn) or PDF (for client deliverables)
- Auto-saved to the URL so you can bookmark and return later, or send the URL to a colleague to continue editing

The matrix uses binary involvement indicators (one dot per party, on or off) rather than percentage breakdowns. This is deliberate. "Microsoft handles 35% of identity" is not a defensible number. "Microsoft and the MSP are both involved in identity" is.

## Running locally

This is a static site. No build step, no dependencies to install.

```bash
git clone https://github.com/blacksmithinfosec/shared-responsibility-matrix.git
cd shared-responsibility-matrix
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser. Any static file server works. Modern browsers will not load local JS files from `file://` URLs, so you need to serve over HTTP.

## Hosting

Deploy to any static host: Vercel, Netlify, GitHub Pages, Cloudflare Pages. No backend, no environment variables.

## How the data is structured

- `categories.js` defines the seven responsibility categories shown as columns.
- `systems.js` defines the system catalog and the default responsibility assignments for each system.

Each cell assignment is an array of party codes: `'v'` (vendor / platform provider), `'m'` (MSP), `'c'` (client). An empty array means the category does not apply to that system. The dot for each party is filled when the code is present and outlined when it is not.

To add a new system type or change the default assignments, edit `systems.js`. The change picks up on page reload.

## Why open source

MSPs spend hours building these matrices manually in PowerPoint or Excel for every new client. Most of the data is the same across customers. This tool exists so that work can be done once and shared, and so MSPs can spend their time on the customer-specific parts.

The defaults in `systems.js` are an opinionated starting point drawn from public shared responsibility documentation (Microsoft, AWS, CIS, CSA) and Blacksmith's MSP-experience overlay. They are not the right answer for every engagement. The intent is for MSPs to fork or override per engagement.

## Roadmap

v0 (this version):

- Static system catalog
- Live preview as you type
- PNG export

v0.x:

- PDF export
- MSP logo upload
- Per-cell responsibility override
- Save and reload engagements (local storage)
- More systems in the catalog

v1:

- Per-system responsibility overrides at engagement level
- Framework annotations (CMMC, HIPAA, NIST 800-171 references on rows)
- Multiple matrix layouts (this one, plus a per-system card layout)

## License

MIT. Use it however you want, including commercial work and white-labeling under your own brand. A backlink to Blacksmith is appreciated but not required.

## Contributing

Pull requests welcome, especially for:

- New system types not yet in the catalog
- Corrections to default assignments with reasoning
- Additional vendor variants (e.g., Huntress vs Defender for endpoint protection)
- Localization

Open an issue first for anything larger so we can talk through the shape before you write code.
