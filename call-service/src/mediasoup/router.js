'use strict';

const config = require('../config/mediasoup.config');

/**
 * Create a mediasoup Router for a room.
 */
async function createRouter(worker) {
  const router = await worker.createRouter({ mediaCodecs: config.router.mediaCodecs });
  return router;
}

module.exports = { createRouter };
