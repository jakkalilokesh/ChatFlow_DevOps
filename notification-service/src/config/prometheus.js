const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const presenceEvents = new client.Counter({
  name: 'notification_presence_events_total',
  help: 'Total presence events (online/offline)',
  labelNames: ['status'],
  registers: [register],
});

module.exports = { register, presenceEvents };
