const { GAME_STATES } = require("../../constants/gameStates");
const { ActiveGame, OnlineUser } = require("../../models");

module.exports = (io) => async (square, playerId) => {
    const user = await OnlineUser.findOne({ player_id: playerId });
    if (!user) return;

    const roomId = user.room_id;
    if (!roomId) return;

    const game = await ActiveGame.findOne({ game_id: gameId });
    if (!game) return;

    if (game.game_state === GAME_STATES.placing_bombs) {
        const player = (game.players[0].id === playerId) ? room.players[0] : room.players[1];
        const isWhite = player.is_white;

        // TODO: send error messages instead of just console logging
        if (player.bombs.length < 3) {
            if (((isWhite && (square[1] === '3' || square[1] === '4')) || (!isWhite && (square[1] === '5' || square[1] === '6'))) && !(player.bombs.includes(square))) {
                player.bombs.push(square);
                await game.save();
                console.log(`User ${playerId} from room ${roomId} placed a bomb on ${square}.`);

                // tell everyone in the game about this update
                io.to(roomId).emit("bombPlaced", square);

                // check to see if we have finished placing bombs, so then we move onto the game
                if (game.players[0].bombs.length + game.players[1].bombs.length === 6) {
                    game.game_state = GAME_STATES.playing;
                    await game.save();
                    console.log(`Finished bomb placements for room ${roomId}.`);

                    // everyone placed their bombs, so no need to make randomized bombs
                    io.to(roomId).emit("startPlay", { randomizedWhitePlayerBombs: null, randomizedBlackPlayerBombs: null });
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