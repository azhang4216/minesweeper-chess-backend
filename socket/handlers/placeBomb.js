const {
    getActivePlayer,
    // addBombToPlayer,
    haveAllBombsBeenPlaced,
    updateRoomField,
    // roomExists,
    // setRoom,
    // getRoomField,
    tryLockPlayer,
    getRoom
} = require("../../redis");

const { GAME_STATES } = require("../gameStates");

module.exports = (socket, io, redis) => async (square) => {
    const roomId = await getActivePlayer(redis, socket.id);
    if (!roomId) return;

    const acquired = await tryLockPlayer(redis, socket.id);
    if (!acquired) return;

    const room = await getRoom(redis, roomId);
    if (!room || room.game_state !== GAME_STATES.placing_bombs) return;

    const players = room.players;
    const player = players.find(p => p.user_id === socket.id);
    if (!player) return;

    const isWhite = player.is_white;

    if (player.bombs.length >= 3 || player.bombs.includes(square)) return;

    const validRow = isWhite ? ['3', '4'] : ['5', '6'];
    if (!validRow.includes(square[1])) return;

    player.bombs.push(square);
    await updateRoomField(redis, roomId, "players", players);

    io.to(roomId).emit("bombPlaced", square);

    const allBombsPlaced = await haveAllBombsBeenPlaced(redis, roomId);
    if (allBombsPlaced) {
        await updateRoomField(redis, roomId, "game_state", GAME_STATES.playing);
        io.to(roomId).emit("startPlay", { 
            whitePlayerBombs: null, 
            blackPlayerBombs: null 
        }); // everyone placed bombs already, so no need to randomize
    }

    // const roomGameState = await getRoomField(redis, roomId, "game_state");
    // if (roomGameState === GAME_STATES.placing_bombs) {
    //     const players = await getRoomField(redis, roomId, "players");
    //     if (!players) return;

    //     const player = (players[0].user_id === socket.id) ? players[0] : players[1];
    //     const isWhite = player.is_white;

    //     // TODO: send error messages instead of just console logging
    //     if (player.bombs.length < 3 && !player.bombs.includes(square)) {
    //         if (((isWhite && (square[1] === '3' || square[1] === '4')) || (!isWhite && (square[1] === '5' || square[1] === '6'))) && !(player.bombs.includes(square))) {
    //             await addBombToPlayer(redis, roomId, socket.id, square);
    //             console.log(`User ${socket.id} from room ${roomId} placed a bomb on ${square}.`);

    //             // tell everyone in the game about this update
    //             io.to(roomId).emit("bombPlaced", square);

    //             // check to see if we have finished placing bombs, so then we move onto the game
    //             const allBombsArePlaced = await haveAllBombsBeenPlaced(redis, roomId);
    //             if (allBombsArePlaced) {
    //                 await updateRoomField(redis, roomId, "game_state", GAME_STATES.playing);
    //                 console.log(`Finished bomb placements for room ${roomId}.`);

    //                 io.to(roomId).emit("startPlay", { whitePlayerBombs:null, blackPlayerBombs:null });  // everyone placed bombs already!
    //             }
    //         } else {
    //             console.log(`User ${socket.id} from room ${roomId}, as ${isWhite ? "white" : "black"}, cannot place a bomb on ${square}.`);
    //         }
    //     } else {
    //         console.log(`User ${socket.id} from room ${roomId} has already placed all 3 bombs.`);
    //     }
    // } else {
    //     console.log(`User ${socket.id} from room ${roomId} is trying to place bombs when they're not supposed to.`)
    // }
}