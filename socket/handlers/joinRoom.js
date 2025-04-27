const { Chess } = require("chess.js");
const { GAME_STATES } = require("../gameStates");
const { CountdownTimer, randomlyFillBombs } = require("../../helpers");

module.exports = (socket, io, games, activePlayers) => (roomId) => {
    console.log(`User ${socket.id} is trying to join room ${roomId}...`);
    const room = games[roomId];

    // TODO: implement other time controls
    const secsToPlay = 300; // 5 minutes

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
                    // we will add the timer later, when the second player joins
                }
            ],
            game_state: GAME_STATES.matching
        };

        activePlayers[socket.id] = roomId;

        socket.join(roomId);
        console.log(`User ${socket.id} started a new room ${roomId}, and is assigned white: ${games[roomId].players[0].is_white}`);
        socket.emit("roomCreated", { roomId, message: "Room created. Waiting for opponent..." });
        return;

    } else if (room.players.length >= 2) {
        // room is full
        console.log(`User ${socket.id} is trying to join a full room: ${roomId}`)
        socket.emit("roomJoinError", { reason: "ROOM_FULL", message: "Room is full." });
        return;
    } else if (room.players && socket.id === room.players[0].user_id) {
        // for some reason, double registered the same player
        console.log(`User ${socket.id} is already in room ${roomId}...`);
    };

    // let's pair them for a game!
    room.players.push({
        user_id: socket.id,
        is_white: !room.players[0].is_white,
        bombs: [],
        elo: 1500, // TODO: replace with real elo once profiles feature implemented
    });
    console.log(`Player ${room.players[1].user_id} is white: ${room.players[1].is_white}.`)

    // different starting positions to test with!
    // const twoRooksOneKing = "8/8/8/8/8/8/4k3/K2R4 w - - 0 1";
    const customFen = "6kq/8/8/6r1/K7/6r1/2N5/1Q6 w - - 0 1";

    room.game = new Chess(customFen);
    room.game_state = GAME_STATES.placing_bombs;
    room.time_control = secsToPlay;

    socket.join(roomId);
    activePlayers[socket.id] = roomId;
    console.log(`User ${socket.id} is matched, joining room ${roomId}`);

    // start timer - 1 minute to place bombs
    const secsToPlaceBomb = 60;
    // await redis.set(`bomb_timer:${roomId}`, "", { ex: secsToPlaceBomb });

    // technically, don't need to assign the bomb_timer to the room but for now we will
    room.bomb_timer = new CountdownTimer(secsToPlaceBomb, () => {
        if (room && room.game_state === GAME_STATES.placing_bombs) {
            // someone hasn't finished placing bombs yet! so we place them for them, and start the game!
            [whitePlayerBombs, blackPlayerBombs] = randomlyFillBombs(room);
            io.to(roomId).emit("startPlay", { whitePlayerBombs, blackPlayerBombs });
            room.game_state = GAME_STATES.playing;
        } else {
            console.log(`Bomb timer for ${roomId} went off, but either game ended or everyone already placed bombs.`);
        }
    });
    room.bomb_timer.start();

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
