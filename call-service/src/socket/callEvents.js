'use strict';

const { createRouter } = require('../mediasoup/router');
const { createWebRtcTransport } = require('../mediasoup/transport');
const { createProducer, createConsumer } = require('../mediasoup/producer-consumer');
const { getNextWorker } = require('../mediasoup/worker');
const roomManager = require('../rooms/RoomManager');

/**
 * Register all Socket.io call event handlers.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {object} user  — decoded JWT user
 * @param {import('winston').Logger} logger
 */
function registerCallEvents(io, socket, user, logger) {
  const { id: userId, username } = user;

  // ─── call:initiate ────────────────────────────────────────
  socket.on('call:initiate', async ({ roomId, callType = 'video' }) => {
    try {
      const callRoomId = `${roomId}-${Date.now()}`;
      const worker = getNextWorker();
      const router = await createRouter(worker);
      roomManager.createRoom(callRoomId, router, userId, callType);
      roomManager.addPeer(callRoomId, socket.id, { userId, username, avatar: user.avatarUrl });

      socket.join(callRoomId);
      socket.callRoomId = callRoomId;

      // Notify others in the chat room
      socket.to(roomId).emit('call:incoming', {
        callRoomId,
        callerId: userId,
        callerName: username,
        callType,
      });

      socket.emit('call:initiated', { callRoomId, callType });
      logger.info('Call initiated', { callRoomId, userId, callType });
    } catch (err) {
      logger.error('call:initiate error', { err: err.message });
      socket.emit('error', { message: 'Failed to initiate call' });
    }
  });

  // ─── call:join ────────────────────────────────────────────
  socket.on('call:join', async ({ callRoomId }) => {
    try {
      const room = roomManager.getRoom(callRoomId);
      if (!room) { socket.emit('error', { message: 'Call room not found' }); return; }

      roomManager.addPeer(callRoomId, socket.id, { userId, username, avatar: user.avatarUrl });
      socket.join(callRoomId);
      socket.callRoomId = callRoomId;

      // Notify existing participants
      socket.to(callRoomId).emit('call:participant-joined', { userId, username, avatar: user.avatarUrl });

      // Send existing producers to new joiner
      const existingProducers = [];
      for (const [sid, peer] of roomManager.getPeers(callRoomId)) {
        if (sid !== socket.id) {
          for (const [producerId, producer] of peer.producers) {
            existingProducers.push({ producerId, peerId: peer.userId, kind: producer.kind });
          }
        }
      }
      socket.emit('call:existing-producers', { producers: existingProducers });
      logger.info('Participant joined call', { callRoomId, userId });
    } catch (err) {
      logger.error('call:join error', { err: err.message });
    }
  });

  // ─── call:leave ───────────────────────────────────────────
  socket.on('call:leave', ({ callRoomId }) => {
    const roomId = callRoomId || socket.callRoomId;
    if (!roomId) return;
    roomManager.removePeer(roomId, socket.id);
    socket.leave(roomId);
    io.to(roomId).emit('call:participant-left', { userId });
    logger.info('Participant left call', { callRoomId: roomId, userId });
  });

  // ─── call:end ─────────────────────────────────────────────
  socket.on('call:end', ({ callRoomId }) => {
    const room = roomManager.getRoom(callRoomId);
    if (!room) return;
    if (room.initiatorId !== userId) {
      socket.emit('error', { message: 'Only the initiator can end the call' });
      return;
    }
    io.to(callRoomId).emit('call:ended', {});
    roomManager.deleteRoom(callRoomId);
    logger.info('Call ended by initiator', { callRoomId, userId });
  });

  // ─── webrtc:get-rtp-capabilities ─────────────────────────
  socket.on('webrtc:get-rtp-capabilities', ({ callRoomId }) => {
    const room = roomManager.getRoom(callRoomId);
    if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
    socket.emit('webrtc:rtp-capabilities', { rtpCapabilities: room.router.rtpCapabilities });
  });

  // ─── webrtc:create-transport ──────────────────────────────
  socket.on('webrtc:create-transport', async ({ callRoomId, direction }) => {
    try {
      const room = roomManager.getRoom(callRoomId);
      if (!room) { socket.emit('error', { message: 'Room not found' }); return; }

      const { transport, params } = await createWebRtcTransport(room.router);
      const peer = roomManager.getPeer(callRoomId, socket.id);
      if (peer) peer.transports.set(transport.id, transport);

      socket.emit('webrtc:transport-created', { ...params, direction });
    } catch (err) {
      logger.error('webrtc:create-transport error', { err: err.message });
    }
  });

  // ─── webrtc:connect-transport ─────────────────────────────
  socket.on('webrtc:connect-transport', async ({ callRoomId, transportId, dtlsParameters }) => {
    try {
      const peer = roomManager.getPeer(callRoomId, socket.id);
      if (!peer) return;
      const transport = peer.transports.get(transportId);
      if (!transport) return;
      await transport.connect({ dtlsParameters });
      socket.emit('webrtc:transport-connected', { transportId });
    } catch (err) {
      logger.error('webrtc:connect-transport error', { err: err.message });
    }
  });

  // ─── webrtc:produce ───────────────────────────────────────
  socket.on('webrtc:produce', async ({ callRoomId, transportId, kind, rtpParameters, appData }) => {
    try {
      const peer = roomManager.getPeer(callRoomId, socket.id);
      if (!peer) return;
      const transport = peer.transports.get(transportId);
      if (!transport) return;

      const producer = await createProducer(transport, { kind, rtpParameters, appData });
      peer.producers.set(producer.id, producer);

      socket.emit('webrtc:produced', { producerId: producer.id });

      // Notify other peers of new producer
      socket.to(callRoomId).emit('webrtc:new-producer', {
        producerId: producer.id,
        peerId: userId,
        kind,
      });
    } catch (err) {
      logger.error('webrtc:produce error', { err: err.message });
    }
  });

  // ─── webrtc:consume ───────────────────────────────────────
  socket.on('webrtc:consume', async ({ callRoomId, producerId, transportId, rtpCapabilities }) => {
    try {
      const room = roomManager.getRoom(callRoomId);
      const peer = roomManager.getPeer(callRoomId, socket.id);
      if (!room || !peer) return;

      const transport = peer.transports.get(transportId);
      if (!transport) return;

      // Find producer across all peers
      let targetProducer = null;
      for (const [, p] of roomManager.getPeers(callRoomId)) {
        if (p.producers.has(producerId)) {
          targetProducer = p.producers.get(producerId);
          break;
        }
      }
      if (!targetProducer) return;

      const consumer = await createConsumer(transport, targetProducer, rtpCapabilities, room.router);
      peer.consumers.set(consumer.id, consumer);

      socket.emit('webrtc:consumed', {
        consumerId: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    } catch (err) {
      logger.error('webrtc:consume error', { err: err.message });
    }
  });

  // ─── webrtc:consumer-resume ───────────────────────────────
  socket.on('webrtc:consumer-resume', async ({ callRoomId, consumerId }) => {
    try {
      const peer = roomManager.getPeer(callRoomId, socket.id);
      if (!peer) return;
      const consumer = peer.consumers.get(consumerId);
      if (consumer) await consumer.resume();
    } catch (err) {
      logger.error('webrtc:consumer-resume error', { err: err.message });
    }
  });

  // ─── call:toggle-audio ────────────────────────────────────
  socket.on('call:toggle-audio', ({ callRoomId, muted }) => {
    socket.to(callRoomId).emit('call:peer-audio-toggled', { userId, muted });
  });

  // ─── call:toggle-video ────────────────────────────────────
  socket.on('call:toggle-video', ({ callRoomId, hidden }) => {
    socket.to(callRoomId).emit('call:peer-video-toggled', { userId, hidden });
  });

  // ─── call:screen-share ────────────────────────────────────
  socket.on('call:screen-share', ({ callRoomId, sharing }) => {
    socket.to(callRoomId).emit('call:peer-screen-share', { userId, sharing });
  });

  // ─── Cleanup on disconnect ────────────────────────────────
  socket.on('disconnect', () => {
    const roomId = socket.callRoomId;
    if (roomId && roomManager.getRoom(roomId)) {
      roomManager.removePeer(roomId, socket.id);
      io.to(roomId).emit('call:participant-left', { userId });
    }
  });
}

module.exports = { registerCallEvents };
