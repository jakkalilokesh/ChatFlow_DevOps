'use strict';

const mediasoup = require('mediasoup');
const config = require('../config/mediasoup.config');
const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

let workers = [];
let workerIndex = 0;

async function createWorkers() {
  const numWorkers = Math.min(Object.keys(require('os').cpus()).length, 4);
  logger.info(`Creating ${numWorkers} mediasoup workers`);

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      rtcMinPort: config.worker.rtcMinPort,
      rtcMaxPort: config.worker.rtcMaxPort,
      logLevel: config.worker.logLevel,
      logTags: config.worker.logTags,
    });

    worker.on('died', () => {
      logger.error(`mediasoup worker died [pid:${worker.pid}] — exiting`);
      process.exit(1);
    });

    workers.push(worker);
    logger.info(`Worker created [pid:${worker.pid}]`);
  }
}

function getNextWorker() {
  const worker = workers[workerIndex];
  workerIndex = (workerIndex + 1) % workers.length;
  return worker;
}

module.exports = { createWorkers, getNextWorker };
