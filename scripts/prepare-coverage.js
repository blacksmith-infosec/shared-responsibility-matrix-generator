import { cp, readFile, rm, stat, writeFile } from 'node:fs/promises';

const readCoveragePercentages = async () => {
  const summary = JSON.parse(await readFile('coverage/coverage-summary.json', 'utf8'));
  const percentages = {
    lines: summary?.total?.lines?.pct,
    branches: summary?.total?.branches?.pct,
  };

  for (const [metric, percentage] of Object.entries(percentages)) {
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw new Error(`Invalid ${metric} coverage percentage in coverage/coverage-summary.json.`);
    }
  }

  return percentages;
};

const createCoverageBadge = (label, percentage) => {
  const value = `${percentage.toFixed(2)}%`;
  const color = percentage >= 80 ? '#4c1' : '#e05d44';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="176" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <rect width="112" height="20" fill="#555"/>
  <rect x="112" width="64" height="20" fill="${color}"/>
  <g fill="#fff" text-anchor="middle" font-family="Verdana, Geneva, sans-serif" font-size="11" aria-hidden="true">
    <text x="56" y="14">${label}</text>
    <text x="144" y="14">${value}</text>
  </g>
</svg>
`;
};

const prepareCoverage = async () => {
  const percentages = await readCoveragePercentages();
  const buildEntry = await stat('dist/index.html');
  if (!buildEntry.isFile()) {
    throw new Error('Build the application before preparing coverage: dist/index.html must be a file.');
  }

  await writeFile('coverage/line-coverage.svg', createCoverageBadge('line coverage', percentages.lines));
  await writeFile('coverage/branch-coverage.svg', createCoverageBadge('branch coverage', percentages.branches));
  await rm('dist/coverage', { recursive: true, force: true });
  await cp('coverage', 'dist/coverage', { recursive: true });
};

await prepareCoverage();
