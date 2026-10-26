// Test-only worker. Refuses hosted databases before importing the application.
require('./testEnvironment');
const { app, httpServer, io, ready } = require('../app');
const { monitorEventLoopDelay } = require('node:perf_hooks');
const lag = monitorEventLoopDelay({ resolution: 20 }); lag.enable();
app.get('/__test/metrics', (req, res) => res.json({ pid: process.pid, clients: io.engine.clientsCount,
  rssMb: process.memoryUsage().rss / 1024 / 1024, eventLoopP99Ms: lag.percentile(99) / 1e6 }));
ready.then(() => httpServer.listen(Number(process.env.TEST_LISTEN_PORT) || 0, '127.0.0.1', () => {
  process.send?.({ url: `http://127.0.0.1:${httpServer.address().port}`, pid: process.pid });
})).catch(() => process.exit(1));
