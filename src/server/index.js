const express = require('express');
const { buildApiRouter } = require('./routes/api');
const config = require('./config');

function createApp() {
  const app = express();

  app.use('/api', buildApiRouter());
  app.use(express.static(config.paths.public, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return;
      }
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return;
      }
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
    },
  }));

  app.use('/img', express.static(config.paths.img));
  return app;
}

function start({ port = 3000 } = {}) {
  const app = createApp();
  app.listen(port, () => {
    console.log(`Servidor activo en http://localhost:${port}`);
  });
  return app;
}

module.exports = {
  createApp,
  start,
};
