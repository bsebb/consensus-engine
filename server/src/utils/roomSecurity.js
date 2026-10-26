const { verifyHostToken } = require('./hostAuth');

function publicParticipant(p) {
  return {
    id: p.id, name: p.name || 'Guest', isHost: Boolean(p.isHost),
    isOnline: Boolean(p.isOnline), status: p.status || 'online',
    budgetSealed: Boolean(p.budgetSealed),
  };
}

function isSocketMember(socket, pin, lobby, claimedId) {
  return Boolean(typeof pin === 'string' && socket.data.pin === pin &&
    socket.data.participantId && (!claimedId || claimedId === socket.data.participantId) &&
    lobby?.has(socket.data.participantId) &&
    lobby.get(socket.data.participantId).deviceId === socket.data.deviceId);
}

function isSocketHost(socket, pin, lobby, data = {}) {
  if (!isSocketMember(socket, pin, lobby)) return false;
  const id = socket.data.participantId;
  // Host migration is a server-side roster decision, scoped to this room.
  return Boolean(lobby.get(id)?.isHost &&
    (!data.host_id || data.host_id === id));
}

function authenticatedParticipant(room, participantId, deviceId) {
  if (typeof deviceId !== 'string' || !deviceId) return null;
  return room?.participants?.find(p => p.deviceId === deviceId && p.id === participantId) || null;
}

function authenticatedHost(room, credentials = {}, lobby) {
  if (!room) return false;
  const hostId = lobby?.hostId || room.hostId;
  if (credentials.host_id !== hostId) return false;
  return verifyHostToken(room.pin, hostId, credentials.host_token) ||
    Boolean(authenticatedParticipant(room, hostId, credentials.device_id));
}

function forbidden(res) {
  return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Valid room authorization is required.' });
}

module.exports = { publicParticipant, isSocketMember, isSocketHost, authenticatedParticipant, authenticatedHost, forbidden };
