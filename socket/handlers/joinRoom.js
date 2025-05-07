const { Chess } = require("chess.js");
const { GAME_STATES } = require("../gameStates");
const { CountdownTimer, randomlyFillBombs } = require("../../helpers");
import {
    addPlayerToRoom,
    getRoom,
    updateRoomField,
    setActivePlayer
} from "../../redis";

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
    };

    // everything checks out - let's pair them for a game!
    const players = await addPlayerToRoom(redis, room, {
        user_id: socket.id,
        is_white: !room.players[0].is_white,
        bombs: [],
        elo: 1500, // TODO: replace with real elo once profiles feature implemented
    });

    // different starting positions to test with!
    // const twoRooksOneKing = "8/8/8/8/8/8/4k3/K2R4 w - - 0 1";
    // const customFen = "6k1/8/4q3/6r1/1K6/6r1/8/8 w - - 0 1";
    const roomGame = new Chess();

    await updateRoomField(redis, roomId, "game", roomGame);
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

    io.to(roomId).emit("roomJoined", {
        roomId,
        message: "Both players joined. Game can start!",
        players,
        fen: roomGame.fen(),
        secsToPlaceBomb,
        secsToPlay: room.time_control,
    });
};
