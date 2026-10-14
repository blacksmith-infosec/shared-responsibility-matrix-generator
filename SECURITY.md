# Security Policy

## Data privacy

This is a client-side application with no application backend. Matrix details are encoded in the URL fragment: client and MSP names, systems, vendors, and responsibility assignments. The fragment is not sent as part of a normal HTTP request to the static host, but the complete URL can appear in browser history, bookmarks, shared messages, or browser extensions. Anyone with that URL can decode the matrix. It is not encrypted.

The uploaded MSP logo and theme preference are stored in localStorage on the current browser and origin. Logos are not included in shared matrix URLs. Use the logo's remove control or clear site storage to remove a stored logo. Downloaded PNG, PDF, and CSV files may contain client information; handle those files accordingly.

The app requests fonts from Google Fonts, exposing normal request metadata to Google's font hosts. Application dependencies and branding assets are served with the site. Following external links contacts the destination sites. The application does not include analytics or an assessment API.

## Reporting a vulnerability

Email **security@blacksmithinfosec.com** rather than opening a public issue for an unpatched vulnerability. Include the affected commit or version, reproduction steps, expected impact, and a proof of concept where possible. Do not include real client data, credentials, or sensitive matrix URLs.

We will coordinate remediation and public disclosure with the reporter. Report non-sensitive template accuracy issues through [GitHub issues](https://github.com/blacksmith-infosec/shared-responsibility-matrix-generator/issues), with a vendor source and an anonymized example.

## Supported version

Security fixes target the current `main` branch. Fork maintainers are responsible for updating their dependencies and deployments.

## Development checks

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`, and `npm audit` before releasing. GitHub Actions runs lint, type checks, unit tests, the build, and functional browser tests. Dependabot proposes dependency and GitHub Actions updates.

React renders user text without raw HTML injection. CSV exports prefix formula-like text so that opening a matrix in a spreadsheet does not execute it. Keep these boundaries and the URL-state validation intact when adding features. Security fixes should include a failing regression test, the rejected unsafe case, and the allowed behavior that must continue to work.

## Limitations

Matrix defaults are planning guidance, not a contractual allocation of responsibility. Confirm the scope with the client and vendor. Browser storage is not encrypted by the application. Hosting access logs, HTTPS, and response security headers are controlled by the chosen static host.

## Contact

- Security: security@blacksmithinfosec.com
- General issues: https://github.com/blacksmith-infosec/shared-responsibility-matrix-generator/issues

Last updated: October 14, 2026
