module.exports = (socket, io, games, activePlayers) => () => {
    console.log("User disconnected:", socket.id);

    const roomId = activePlayers[socket.id];
    if (!roomId) return;

    const room = games[roomId];
    if (!room) return;

    games[roomId]["players"].forEach((player, _index, _array) => {
        delete activePlayers[player.user_id];
        console.log(`Removed player ${player.user_id}, room ${roomId}, from active players.`);
    });

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

    // TODO: persistent game recording in DB
    delete games[roomId];

    io.to(roomId).emit("playerDisconnected", {
        roomId,
        message: `Player ${socket.id} disconnected from game room ${roomId}.`
    });

    console.log(`Active games: ${JSON.stringify(games)}`);
    console.log(`Active players: ${JSON.stringify(activePlayers)}`);
}