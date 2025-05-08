// const { Chess } = require("chess.js");
const { GAME_STATES } = require("../gameStates");
const { CountdownTimer, randomlyFillBombs } = require("../../helpers");
const {
    addPlayerToRoom,
    getRoom,
    updateRoomField,
    setActivePlayer,
    getActivePlayer,
    deleteRoom
} = require("../../redis");

module.exports = (socket, io, redis) => async (roomId, callback) => {
    console.log(`User ${socket.id} is trying to join room ${roomId}...`);
    const room = await getRoom(redis, roomId);

    if (!room) {
        // room no longer exists
        return callback({
            success: false,
            message: "Room no longer exists. Please try refreshing."
        });
    } else if (room.players.length >= 2) {
        // room is full
        console.log(`User ${socket.id} is trying to join a full room: ${roomId}`)
        return callback({
            success: false,
            message: "Room is full. Please try another room."
        });
    } else if (room.players && socket.id === room.players[0].user_id) {
        // for some reason, double registered the same player
        console.log(`User ${socket.id} is already in room ${roomId}...`);
    } 
    
    const opponentRoomId = await getActivePlayer(redis, room.players[0].user_id);
    if (opponentRoomId === null || opponentRoomId !== roomId) {
        // the person that started the room is no longer actively online
        // we have to delete it 
        await deleteRoom(redis, roomId);

        return callback({
            success: false,
            message: "Room has been cancelled. Please try another room."
        });
    }

    // everything checks out - let's pair them for a game!
    const players = await addPlayerToRoom(redis, roomId, {
        user_id: socket.id,
        is_white: !room.players[0].is_white,
        bombs: [],
        elo: 1500, // TODO: replace with real elo once profiles feature implemented
    });
    console.log(`Players: ${players}`);

    // different starting positions to test with!
    // const twoRooksOneKing = "8/8/8/8/8/8/4k3/K2R4 w - - 0 1";
    // const customFen = "6k1/8/4q3/6r1/1K6/6r1/8/8 w - - 0 1";
    const gamePgn = "";

    await updateRoomField(redis, roomId, "game", gamePgn);
    await updateRoomField(redis, roomId, "game_state", GAME_STATES.placing_bombs);

    socket.join(roomId);
    await setActivePlayer(redis, socket.id, roomId);
    console.log(`User ${socket.id} is matched, joining room ${roomId}`);

    // start timer - 1 minute to place bombs
    const secsToPlaceBomb = 60;

    // TODO: fix this with BullMQ real time background events... timeout!
    // technically, don't need to assign the bomb_timer to the room but for now we will
    const bombTimer = new CountdownTimer(secsToPlaceBomb, () => {
        if (room && room.game_state === GAME_STATES.placing_bombs) {
            // someone hasn't finished placing bombs yet! so we place them for them, and start the game!
            [whitePlayerBombs, blackPlayerBombs] = randomlyFillBombs(room);
            io.to(roomId).emit("startPlay", { whitePlayerBombs, blackPlayerBombs });
            room.game_state = GAME_STATES.playing;
        } else {
            console.log(`Bomb timer for ${roomId} went off, but either game ended or everyone already placed bombs.`);
        }
    });
    bombTimer.start();
    console.log(`Set a bomb timer for room ${roomId}`);

    await timeoutQueue.add(
        "test-timeout",
        {
            roomId: "testRoomID",
            playerId: "testPlayerID"
        },
        {
            delay: 10_000, // 10 seconds
            removeOnComplete: true,
            removeOnFail: true,
            jobId: `testJobID`,
        }
    );

    io.to(roomId).emit("roomJoined", {
        roomId,
        message: "Both players joined. Game can start!",
        players,
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", // indicate it's a new game
        secsToPlaceBomb,
        secsToPlay: room.time_control,
    });
};
