import { GAME_STATES } from "../../constants/index.js";

const placeBomb = (socket, io, games, activePlayers) => (square) => {
    const playerId = socket.data.playerId;
    if (!playerId) return;
    
    const roomId = activePlayers[playerId];
    if (!roomId) return;

    const room = games[roomId];
    if (!room) return;

    if (room.game_state === GAME_STATES.placing_bombs) {
        const player = (room.players[0].user_id === playerId) ? room.players[0] : room.players[1];
        const isWhite = player.is_white;

        // TODO: send error messages instead of just console logging
        if (player.bombs.length < 3) {
            if (((isWhite && (square[1] === '3' || square[1] === '4')) || (!isWhite && (square[1] === '5' || square[1] === '6'))) && !(player.bombs.includes(square))) {
                player.bombs.push(square);
                console.log(`User ${playerId} from room ${roomId} placed a bomb on ${square}.`);

                // tell everyone in the game about this update
                io.to(roomId).emit("bombPlaced", square);

                // check to see if we have finished placing bombs, so then we move onto the game
                if (room.players[0].bombs.length + room.players[1].bombs.length === 6) {
                    room.game_state = GAME_STATES.playing;
                    console.log(`Finished bomb placements for room ${roomId}.`);

                    io.to(roomId).emit("startPlay", { whitePlayerBombs:null, blackPlayerBombs:null });  // everyone placed bombs already!
                }
            } else {
                console.log(`User ${playerId} from room ${roomId}, as ${isWhite ? "white" : "black"}, cannot place a bomb on ${square}.`);
            }
        } else {
            console.log(`User ${playerId} from room ${roomId} has already placed all 3 bombs.`);
        }
    } else {
        console.log(`User ${playerId} from room ${roomId} is trying to place bombs when they're not supposed to.`)
    }
}

export default placeBomb;