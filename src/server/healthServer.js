// src/server/healthServer.js
// Mini HTTP server for health checks and basic metrics.
// Runs on port 3000 (or HEALTH_PORT env var).
const http = require('http');
const logger = require('../utils/logger');

class HealthServer {
  constructor(client) {
    this.client = client;
    this.server = null;
    this.port = parseInt(process.env.HEALTH_PORT || '3000', 10);
  }

  start() {
    this.server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          uptime: process.uptime(),
          guilds: this.client.guilds.cache.size,
          timestamp: new Date().toISOString(),
        }));
      } else if (req.url === '/metrics') {
        const mem = process.memoryUsage();
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(
          `# HELP bot_uptime_seconds Bot uptime in seconds\n` +
          `# TYPE bot_uptime_seconds counter\n` +
          `bot_uptime_seconds ${process.uptime()}\n` +
          `# HELP bot_memory_rss_bytes RSS memory in bytes\n` +
          `# TYPE bot_memory_rss_bytes gauge\n` +
          `bot_memory_rss_bytes ${mem.rss}\n` +
          `# HELP bot_memory_heap_used_bytes Heap used in bytes\n` +
          `# TYPE bot_memory_heap_used_bytes gauge\n` +
          `bot_memory_heap_used_bytes ${mem.heapUsed}\n` +
          `# HELP bot_guilds_count Number of guilds\n` +
          `# TYPE bot_guilds_count gauge\n` +
          `bot_guilds_count ${this.client.guilds.cache.size}\n`
        );
      } else if (req.url === '/alerts/stats') {
        const AlertService = require('../services/alertService');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(AlertService.getStats()));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    this.server.listen(this.port, () => {
      logger.info(`Health server listening on port ${this.port}.`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

module.exports = HealthServer;
