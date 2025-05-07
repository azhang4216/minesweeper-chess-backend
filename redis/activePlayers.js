// Set active player
export async function setActivePlayer(redis, socketId, roomId) {
    return await redis.set(`activePlayers:${socketId}`, roomId);
}

// Get active player roomId by socketId
export async function getActivePlayer(redis, socketId) {
    return await redis.get(`activePlayers:${socketId}`);
}

// Remove active player
export async function removeActivePlayer(redis, socketId) {
    return await redis.del(`activePlayers:${socketId}`);
}