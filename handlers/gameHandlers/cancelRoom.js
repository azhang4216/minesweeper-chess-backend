module.exports = (socket, games, activePlayers) => ({ roomId }, callback) => {
    const playerId = socket.data.playerId;
    console.log(`Player ${playerId} is trying to cancel room ID: ${roomId}.`);

    const roomIdThisPlayerHas = activePlayers[playerId];
    if (!roomIdThisPlayerHas || roomIdThisPlayerHas !== roomId) {
        // shouldn't happen, but check just in case
        return callback({
            success: false,
            message: "Player cannot cancel a game that is not theirs."
        });
    }

    const room = games[roomId];
    if (!room) {
        return callback({
            success: false,
            message: "No such game exists."
        });
    }

    games[roomId]["players"].forEach((player, _index, _array) => {
        delete activePlayers[player.user_id];
        console.log(`Removed player ${player.user_id}, room ${roomId}, from active players.`);
    });

    delete games[roomId];

    console.log(`Active games: ${JSON.stringify(games)}`);
    console.log(`Active players: ${JSON.stringify(activePlayers)}`);

    return callback({
        success: true,
        message: "Successfully cancelled game."
    });
};
