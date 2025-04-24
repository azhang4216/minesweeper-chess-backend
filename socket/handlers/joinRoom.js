const { Chess } = require("chess.js");
const { GAME_STATES } = require("../../constants");
const { getBothPlayers } = require("../../helpers");

module.exports = (socket, io, redis) => async (roomId) => {
    console.log(`User ${socket.id} is trying to join room ${roomId}...`);

    const roomKey = `room:${roomId}`;
    const playersKey = `room:${roomId}:players`;
    const activePlayerKey = "activePlayers";

    // try to get the room from Redis to see if it's already made & is matching for opponent
    const roomData = await redis.hgetall(roomKey);
    console.log(`room data: ${JSON.stringify(roomData)}`);

    // case 1. there is no room under this room ID => let's create a new room!
    if (roomData == null) {
        const playerObj = {
            socket_id: socket.id,
            is_white: Math.random() < 0.5, // 50% change of being either color,
            bombs: [],
            elo: 1500,                     // TODO: replace with real elo once profiles feature implemented
        };

        // save to redis the room & player-room mappings
        await Promise.all([
            redis.set(roomKey, "game_state", GAME_STATES.matching),
            // TODO: make socket.id field into actual user id once DB implemented
            redis.hset(playersKey, socket.id, JSON.stringify(playerObj)),
            redis.set(activePlayerKey, socket.id, roomId)
        ]);

        socket.join(roomId);
        console.log(`User ${socket.id} started a new room ${roomId}`)
        socket.emit("roomCreated", { roomId, message: "Room created. Waiting for opponent..." });
        return;
    };

    const roomGameState = roomData.game_state;
    console.log(`Room game state: ${roomGameState}`);

    // case 2. room is searching for a match => let's pair them for a game!
    if (roomGameState === GAME_STATES.matching) {
        // HVALS retrieves all values in the hash
        const players = await redis.hvals(playersKey);

        // should be the case only 1 player is waiting if still in a matching state for a room
        if (players.length === 1) {
            const opponent = JSON.parse(players[0]);
            const opponentIsWhite = opponent.is_white;

            const playerObj = {
                socket_id: socket.id,
                is_white: !opponentIsWhite,
                bombs: [],
                elo: 1500, // TODO: replace with real elo once profiles feature implemented
            };

            // different starting positions to test with!
            const twoRooksOneKing = "8/8/8/8/8/8/4k3/K2R4 w - - 0 1";
            const game = new Chess(twoRooksOneKing);

            await Promise.all([
                redis.hset(roomKey, "game_state", GAME_STATES.placing_bombs),
                // TODO: make socket.id field into actual user id once DB implemented
                redis.hset(playersKey, socket.id, JSON.stringify(playerObj)),
                redis.set(activePlayerKey, roomId),
                redis.hset(roomKey, "game", game),
                redis.hset(roomKey, "bombPlacementTimeRemaining", 60000), // 60000ms = 1min
                redis.hset(roomKey, "bombPlacementStartTime", Date.now()),
                redis.hset(roomKey, "lastMoveTimestamp", null),
                redis.hset(roomKey, "fen", game.fen())
            ]);

            socket.join(roomId);
            console.log(`User ${socket.id} is matched, joining room ${roomId}`);

            const bothPlayers = await getBothPlayers(redis, playersKey);

            io.to(roomId).emit("roomJoined", {
                roomId,
                message: "Both players joined. Game can start!",
                players: bothPlayers,
                fen: game.fen()
            });
        } else {
            console.log(`Room ${roomId}: game trying to match for opponent, but somehow the number of players is not 1`);
        };

        return;
    };

    // case 3. already in a game => room is full! don't join!
    console.log(`User ${socket.id} is trying to join a full room: ${roomId}`)
    socket.emit("roomJoinError", { reason: "ROOM_FULL", message: "Room is full." });
    return;
};
