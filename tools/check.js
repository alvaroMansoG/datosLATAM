const { execFileSync } = require('child_process');

const files = [
  'server.js',
  'src/server/index.js',
  'src/server/routes/api.js',
  'src/server/services/bidProjects.js',
  'src/server/domain/govSeries.js',
  'public/js/main.js',
  'public/js/bidProjects.js',
];

for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
