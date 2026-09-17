/**
 * @deprecated Use `npm run test:sync` or `npm test` instead.
 * Delegates to tests/integration/sync.test.js
 */
require('child_process').execSync(
  'node --test --test-concurrency=1 tests/integration/sync.test.js',
  { stdio: 'inherit', cwd: require('path').join(__dirname, '..') }
);
