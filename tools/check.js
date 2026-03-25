const { execFileSync } = require('child_process');

const files = [
  'server.js',
  'src/server/index.js',
  'src/server/routes/api.js',
  'src/server/domain/govSeries.js',
  'public/js/main.js',
];

for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
