const path = require('node:path');
const { startServer } = require('next/dist/server/lib/start-server');

const dir = path.resolve(__dirname);

startServer({
  dir,
  isDev: true,
  hostname: '127.0.0.1',
  port: 3010,
  allowRetry: false,
  serverFastRefresh: false,
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
