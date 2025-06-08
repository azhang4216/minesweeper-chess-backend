const { OnlineUser } = require("../../models");
const { finishAndRecordGame } = require("../../helpers"); 

module.exports = (socket) => async (playerId) => {
    console.log("User disconnected:", playerId);

    const user = await OnlineUser.findOne({ player_id: playerId });
    if (!user) return;

    await finishAndRecordGame(user.room_id, playerId, false, "abandonment");
    // games[roomId]["players"].forEach((player, _index, _array) => {
    //     delete activePlayers[player.user_id];
    //     console.log(`Removed player ${player.user_id}, room ${roomId}, from active players.`);
    // });

    // get rid of all associated keys
    // const valOfBombTimerInRoom = await redis.getdel(`bomb_timer:${roomId}`);
    // const valOfWTimerInRoom = await redis.getdel(`player_timer:${roomId}:white`);
    // const valOfBTimerInRoom = await redis.getdel(`player_timer:${roomId}:black`);

    // if (valOfBombTimerInRoom === "") {
    //     console.log(`Removed the active bomb timer expiry key from room ${roomId}`);
    // };
    // if (valOfWTimerInRoom === "") {
    //     console.log(`Removed the active white timer expiry key from room ${roomId}`);
    // };
    // if (valOfBTimerInRoom === "") {
    //     console.log(`Removed the active black timer expiry key from room ${roomId}`);
    // };

    socket.to(opponent.id).emit("opponentDisconnected", {
        disconnectedPlayerId: playerId,
        myEloChange: playerIsWhite ? blackEloChange : whiteEloChange,
        oppEloChange: playerIsWhite ? whiteEloChange : blackEloChange
    });
}