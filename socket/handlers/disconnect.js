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

    // TODO: persistent game recording in DB
    delete games[roomId];

    io.to(roomId).emit("playerDisconnected", {
        roomId,
        message: `Player ${socket.id} disconnected from game room ${roomId}.`
    });

    console.log(`Active games: ${JSON.stringify(games)}`);
    console.log(`Active players: ${JSON.stringify(activePlayers)}`);
}