const { Chess } = require("chess.js");
const { GAME_STATES } = require("../gameStates");

module.exports = (socket, io, games, activePlayers, redis) => async (roomId) => {
    console.log(`User ${socket.id} is trying to join room ${roomId}...`);
    const room = games[roomId];

    // TODO: implement other time controls
    const secsToPlay = 40;

    if (!room) {
        // create a new room
        games[roomId] = {
            players: [
                {
                    // TODO: replace id when authentication done for persistence
                    user_id: socket.id,
                    is_white: Math.random() < 0.5, // 50% change of being either or
                    bombs: [],
                    elo: 1500,                     // place holder
                    seconds_left: secsToPlay       // updated from end of their move, so does not reflect CURRENT seconds left
                }
            ],
            game_state: GAME_STATES.matching
        };

        activePlayers[socket.id] = roomId;

        socket.join(roomId);
        console.log(`User ${socket.id} started a new room ${roomId}`)
        socket.emit("roomCreated", { roomId, message: "Room created. Waiting for opponent..." });
        return;

    } else if (room.players.length >= 2) {
        // room is full
        console.log(`User ${socket.id} is trying to join a full room: ${roomId}`)
        socket.emit("roomJoinError", { reason: "ROOM_FULL", message: "Room is full." });
        return;

    };

    // let's pair them for a game!
    room.players.push({
        user_id: socket.id,
        is_white: !room.players[0].is_white,
        bombs: [],
        elo: 1500, // TODO: replace with real elo once profiles feature implemented
        seconds_left: secsToPlay
    });

    // different starting positions to test with!
    const twoRooksOneKing = "8/8/8/8/8/8/4k3/K2R4 w - - 0 1";

    room.game = new Chess(twoRooksOneKing);
    room.game_state = GAME_STATES.placing_bombs;
    room.time_control = secsToPlay;

    socket.join(roomId);
    activePlayers[socket.id] = roomId;
    console.log(`User ${socket.id} is matched, joining room ${roomId}`);

    // start timer - 1 minute to place bombs
    // const secsToPlaceBomb = 60;
    const secsToPlaceBomb = 30;
    await redis.set(`bomb_timer:${roomId}`, "", { ex: secsToPlaceBomb });
    console.log(`Set a bomb timer for room ${roomId}`);

    io.to(roomId).emit("roomJoined", {
        roomId,
        message: "Both players joined. Game can start!",
        players: room.players,
        fen: room.game.fen(),
        secsToPlaceBomb,
        secsToPlay
    });
};
