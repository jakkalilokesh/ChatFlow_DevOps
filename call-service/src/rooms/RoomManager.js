'use strict';

/**
 * RoomManager — in-memory store for active call rooms.
 *
 * Room structure:
 * {
 *   callRoomId: string,
 *   router: mediasoup.Router,
 *   peers: Map<socketId, { userId, username, avatar, transports, producers, consumers }>
 *   callType: 'audio' | 'video' | 'screen',
 *   initiatorId: string,
 *   createdAt: Date
 * }
 */
class RoomManager {
  constructor() {
    /** @type {Map<string, object>} */
    this.rooms = new Map();
  }

  createRoom(callRoomId, router, initiatorId, callType) {
    const room = {
      callRoomId,
      router,
      peers: new Map(),
      callType,
      initiatorId,
      createdAt: new Date(),
    };
    this.rooms.set(callRoomId, room);
    return room;
  }

  getRoom(callRoomId) {
    return this.rooms.get(callRoomId);
  }

  deleteRoom(callRoomId) {
    const room = this.rooms.get(callRoomId);
    if (room) {
      // Close all transports
      for (const [, peer] of room.peers) {
        for (const transport of peer.transports.values()) {
          transport.close();
        }
      }
      room.router.close();
      this.rooms.delete(callRoomId);
    }
  }

  addPeer(callRoomId, socketId, peerData) {
    const room = this.rooms.get(callRoomId);
    if (!room) return;
    room.peers.set(socketId, {
      ...peerData,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    });
  }

  removePeer(callRoomId, socketId) {
    const room = this.rooms.get(callRoomId);
    if (!room) return;
    const peer = room.peers.get(socketId);
    if (peer) {
      for (const transport of peer.transports.values()) transport.close();
      room.peers.delete(socketId);
    }
    if (room.peers.size === 0) {
      this.deleteRoom(callRoomId);
    }
  }

  getPeer(callRoomId, socketId) {
    return this.rooms.get(callRoomId)?.peers.get(socketId);
  }

  getPeers(callRoomId) {
    return this.rooms.get(callRoomId)?.peers || new Map();
  }

  getStats() {
    const stats = [];
    for (const [id, room] of this.rooms) {
      stats.push({ callRoomId: id, peerCount: room.peers.size, callType: room.callType });
    }
    return stats;
  }
}

module.exports = new RoomManager();
