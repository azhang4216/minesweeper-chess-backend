const { Chess } = require("chess.js");
const { GAME_STATES } = require("../gameStates");

module.exports = (socket, io, games, activePlayers, redis) => async (square) => {
    const roomId = activePlayers[socket.id];
    if (!roomId) return;

    const room = games[roomId];
    if (!room) return;

    if (room.game_state === GAME_STATES.placing_bombs) {
        const player = (room.players[0].user_id === socket.id) ? room.players[0] : room.players[1];
        const isWhite = player.is_white;

        // TODO: send error messages instead of just console logging
        if (player.bombs.length < 3) {
            if (((isWhite && (square[1] === '3' || square[1] === '4')) || (!isWhite && (square[1] === '5' || square[1] === '6'))) && !(player.bombs.includes(square))) {
                player.bombs.push(square);
                console.log(`User ${socket.id} from room ${roomId} placed a bomb on ${square}.`);

                // tell everyone in the game about this update
                io.to(roomId).emit("bombPlaced", square);

                // check to see if we have finished placing bombs, so then we move onto the game
                if (room.players[0].bombs.length + room.players[1].bombs.length === 6) {
                    room.game_state = GAME_STATES.playing;
                    console.log(`Finished bomb placements for room ${roomId}.`);

                    // start timer for players based on set controls
                    const secondsOnClock = room.time_control;
                    const whiteTimerStartKey = `player_timer:${roomId}:white`;
                    const numberOfKeysForWhiteTimer = await redis.exists(whiteTimerStartKey);
                    console.log(`Redis exists white timer key? : ${numberOfKeysForWhiteTimer}`);

                    if (numberOfKeysForWhiteTimer === 0) {
                        await redis.set(whiteTimerStartKey, "", { ex: secondsOnClock });
                        console.log(`Set white timer start for room ${roomId}`);
                    } else {
                        console.log(`White timer start for room ${roomId} already exists`);
                    };

                    const valueOfBombTimer = await redis.getdel(`bomb_timer:${roomId}`);
                    if (valueOfBombTimer === "") {
                        // we've set it to empty string originally, so this means we got it
                        console.log(`Removed bomb timer countdown from room ${roomId}`);
                    } else {
                        console.log(`Could not find bomb timer countdown for room ${roomId}`);
                    }

                    io.to(roomId).emit("startPlay", { whitePlayerBombs:null, blackPlayerBombs:null });  // everyone placed bombs already!
                }
            } else {
                console.log(`User ${socket.id} from room ${roomId}, as ${isWhite ? "white" : "black"}, cannot place a bomb on ${square}.`);
            }
        } else {
            console.log(`User ${socket.id} from room ${roomId} has already placed all 3 bombs.`);
        }
    } else {
        console.log(`User ${socket.id} from room ${roomId} is trying to place bombs when they're not supposed to.`)
    }
}