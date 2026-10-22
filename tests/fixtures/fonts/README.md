These fixtures keep browser tests independent of Google Fonts while preserving the application's typography and visual snapshots.

`google-fonts.css` is the application's [Google Fonts stylesheet](https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap), retrieved on October 22, 2026 with Playwright's Desktop Chrome user agent. The WOFF2 files retain their original Google Fonts filenames and contain every subset referenced by that stylesheet: Alexandria v6 and JetBrains Mono v24. Browser tests intercept the original URLs and serve these files locally.

Both font families use the SIL Open Font License. Their notices are included in [Alexandria-OFL.txt](Alexandria-OFL.txt) and [JetBrains-Mono-OFL.txt](JetBrains-Mono-OFL.txt), copied from the [Alexandria](https://github.com/google/fonts/tree/main/ofl/alexandria) and [JetBrains Mono](https://github.com/google/fonts/tree/main/ofl/jetbrainsmono) directories in Google's font repository.

When the application changes its font families, weights, or Google Fonts versions, refresh the stylesheet and its referenced font files together, retain their license notices, and review the visual tests.
