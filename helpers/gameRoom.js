// for room creation, joining, timer logic
const { GAME_STATES } = require("../constants");

// for the first player who entered to start a room that is matching...
async function createRoom(redis, roomId, player1Id, timeControlMs = 300000) { // 5 mins in ms
    const roomData = {
        id: roomId,
        players: [
            {
                id: player1Id,
                is_white: Math.random() < 0.5,                       // 50% change of being either or
                bombs: [],
                elo: 1200,                                           // Default or from user profile
                playingTimeRemaining: timeControlMs
            }
        ],
        game_state: GAME_STATES.matching
    };

    // Store room data in Redis
    await redis.set(`room:${roomId}`, JSON.stringify(roomData));
};



// Separate timeout checking process that can run on any server in the cluster
async function checkTimeouts(redis, games) {
    const now = Date.now();

    // Get all games that have timed out by retrieving from sorted set
    const timedOutRoomIds = await redis.zrangebyscore('game_timeouts', 0, now);

    for (const roomId of timedOutRoomIds) {
        const gameData = JSON.parse(await redis.get(`game:${roomId}`));

        if (gameData && gameData.active) {
            // Double-check actual time remaining (in case of race conditions)
            const elapsedTime = now - gameData.lastMoveTimestamp;
            const actualTimeRemaining = gameData.timeRemaining[gameData.currentTurn] - elapsedTime;

            if (actualTimeRemaining <= 0) {
                await endGameDueToTimeout(roomId, gameData.currentTurn);
            } else {
                // Update the timeout in our sorted set
                const newTimeout = now + actualTimeRemaining;
                await redis.zadd('game_timeouts', newTimeout, roomId);
            }
        }

        // Remove processed game from the timeout set
        await redis.zrem('game_timeouts', roomId);
    }
};

module.exports = {
    createRoom,
    // startBombPlacement,
    checkTimeouts,
    // submitBombs,
    // makeMove,
    // handleBombPlacementTimeout,
    // handlePlayingTimeout,
};