'use strict';

/**
 * Create a producer (publish audio/video from a transport).
 */
async function createProducer(transport, { kind, rtpParameters, appData }) {
  const producer = await transport.produce({ kind, rtpParameters, appData });
  return producer;
}

/**
 * Create a consumer (subscribe to a producer).
 */
async function createConsumer(transport, producer, rtpCapabilities, router) {
  if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
    throw new Error('Cannot consume producer');
  }

  const consumer = await transport.consume({
    producerId: producer.id,
    rtpCapabilities,
    paused: true, // Start paused, client resumes after setup
  });

  return consumer;
}

module.exports = { createProducer, createConsumer };
