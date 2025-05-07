// Set active player
async function setActivePlayer(redis, socketId, roomId) {
    return await redis.set(`activePlayers:${socketId}`, roomId);
}

// Get active player roomId by socketId
async function getActivePlayer(redis, socketId) {
    return await redis.get(`activePlayers:${socketId}`);
}

// Remove active player
async function removeActivePlayer(redis, socketId) {
    return await redis.del(`activePlayers:${socketId}`);
}

module.exports = {
    setActivePlayer,
    getActivePlayer,
    removeActivePlayer
};
