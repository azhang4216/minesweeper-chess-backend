// using a redis hash to store all player-to-room mappings
// an active player means one who is matching or playing a game!

// Add player to active players when they join a game
async function addActivePlayer(redis, playerId, roomId) {
    await redis.hset('active_players', playerId, roomId);
}

// Remove player when they leave
async function removeActivePlayer(redis, playerId) {
    await redis.hdel('active_players', playerId);
}

// Get player's current room
async function getPlayerRoom(redis, playerId) {
    return await redis.hget('active_players', playerId);
}

// Check if player is active
async function isPlayerActive(redis, playerId) {
    return await redis.hexists('active_players', playerId);
}

// Get all active players (useful for monitoring)
async function getAllActivePlayers(redis) {
    return await redis.hgetall('active_players');
}

module.exports = {
    addActivePlayer,
    removeActivePlayer,
    getPlayerRoom,
    isPlayerActive,
    getAllActivePlayers
};