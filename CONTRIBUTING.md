# Contributing to Shared Responsibility Matrix Generator

This project is maintained by [Blacksmith InfoSec](https://blacksmithinfosec.com). Contributions are welcome. Keep discussions respectful and constructive, and use anonymized examples rather than real client data.

## Getting started

1. Check the existing issues before opening a new one.
2. For a larger change, open an issue describing the problem and proposed behavior before investing significant time.
3. Fork the repository and create a branch from `main`.

Use the Node.js version in `.nvmrc`:

```bash
nvm install
nvm use
npm ci
npm run start
```

The development server runs at `http://localhost:8081`. Commit `package-lock.json` when an intentional dependency change updates it.

## Changes we welcome

- New system templates and corrections to responsibility defaults.
- Accessibility and usability improvements.
- Bug fixes and regression tests.
- Documentation that helps MSPs review and explain the matrix.

For responsibility changes, include a link to authoritative vendor documentation and explain the proposed assignment. Distinguish platform security from tenant settings, user access, operations, and data governance. A template is a starting point; it cannot replace the client's managed services agreement.

## Coding standards

Use TypeScript for application code and follow the existing React and module structure. Prefer functional components, typed props, named handlers, and immutable state updates. Keep domain transformations in `src/modules/` and state shared across the workflow in the existing providers.

Write code for the next reader: use descriptive names, handle invalid and empty states early, and extract helpers when they represent a coherent rule or reusable behavior. Avoid speculative abstractions and unrelated refactors.

The established style uses two spaces, single quotes, semicolons, parenthesized arrow arguments, and readable wrapping around 120 columns. ESLint checks the applicable conventions and accessibility rules. Preserve the existing styles and interaction behavior unless the change explicitly calls for a UI update.

## Test-driven development

For a bug fix:

1. Add a focused regression test in the existing test framework.
2. Run it and confirm it fails because of the reported bug.
3. Make the smallest complete fix.
4. Rerun the test, then run the relevant checks.
5. Refactor only while the tests remain green.

Test observable behavior with readable fixtures. Make sure setup actually reaches the behavior under test; missing elements must fail a test rather than skip its assertion. Unit and component tests belong beside the code in `*.test.ts` or `*.test.tsx` files. Use Vitest and React Testing Library. Browser tests belong in `tests/` and use Playwright.

Before submitting a pull request, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

For changes that affect appearance or layout, also run:

```bash
npm run test:visual
```

To check the production bundle after building, run `PLAYWRIGHT_USE_PREVIEW=1 npm run test:e2e`.
The CI browser checks use this mode.

If you use an existing Google Chrome installation, set `PLAYWRIGHT_CHROME_CHANNEL=chrome` for browser tests. Keep the same operating system and browser when comparing screenshots. Initial visual references are macOS screenshots; CI runs the functional tests on Linux and does not compare those macOS references.

To accept an intentional visual change:

```bash
npm run test:visual -- --update-snapshots
```

Inspect every changed reference and include screenshots in the pull request. Do not update references just to hide a regression. Report which checks ran, their results, and any environment limitation. Keep unrelated failures visible and provide reproduction steps rather than weakening assertions.

## Security and privacy

User text must be rendered as text, never injected as raw HTML. Validate URL state and uploaded images, preserve the logo's separation from shared URLs, and keep exported CSV text safe to open in a spreadsheet. Do not add analytics or external data transmission without an explicit discussion of the change in behavior.

Never commit credentials, private client information, or real assessment URLs. Report security vulnerabilities privately through [SECURITY.md](SECURITY.md), not in public issues or pull requests.

## Pull requests

Describe the concrete problem and resulting behavior, link the related issue, and list the checks you actually ran. Include the observed failing and passing regression test for a bug fix. Note changes to saved URL compatibility, storage, exports, or responsibility defaults.

Keep the change focused and update documentation when commands or behavior change. Maintainers will review the pull request and may ask for revisions before merging.

## Reporting a bug

Include reproduction steps, expected and actual behavior, browser and operating system, and relevant screenshots or error messages. Use synthetic matrix data. A saved URL may contain client information, so remove that information before attaching one.

## License

By contributing, you agree that your contributions will be licensed under Apache 2.0. See [LICENSE](LICENSE).
