import { calculateElo } from "../../helpers/index.js";

const disconnect = (socket, io, games, activePlayers, disconnectTimers) => () => {
    const playerId = socket.data.playerId;
    if (!playerId) return;

    console.log(`Player ${playerId} disconnected.`);

    const roomId = activePlayers[playerId];
    if (!roomId) return;

    const timeoutMs = 30000; // 30 seconds

    // notify the other player of disconnection
    io.to(roomId).emit("playerDisconnected", {
        disconnectedPlayerId: playerId,
        timeoutMs,
        message: `Player ${playerId} disconnected from game room ${roomId}.`
    });

    // start a grace period timeout (30 seconds)
    disconnectTimers[playerId] = setTimeout(() => {
        console.log(`Player ${playerId} did not reconnect in time`);

        // remove from active player tracking
        delete activePlayerRooms[playerId];
        delete disconnectTimers[playerId];

        const room = rooms[roomId];
        if (!room) return;

        // whoever disconnected is the one who lost
        const loser = room.players.find(p => p.id === playerId);
        const winnerColor = loser.is_white ? "b" : "w";
        const [whiteEloChange, blackEloChange] = calculateElo(
            (room.players[0].is_white) ? room.players[0].elo : room.players[1].elo,
            (room.players[0].is_white) ? room.players[1].elo : room.players[0].elo,
            (winnerColor === "w") ? 1 : 0,
        );

        // end game on forfeit
        if (roomId) {
            io.to(roomId).emit("winLossGameOver", {
                winner: winnerColor,
                by: "player forefeit",
                whiteEloChange,
                blackEloChange,
            });
        }

        // TODO: store game in DB
    }, timeoutMs);

    console.log(`Active games: ${JSON.stringify(games)}`);
    console.log(`Active players: ${JSON.stringify(activePlayers)}`);
}

export default disconnect;