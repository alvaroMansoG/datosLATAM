const { start } = require('./src/server');

const PORT = Number(process.env.PORT || 3000);

start({ port: PORT });
