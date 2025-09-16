import { finishAndRecordGame } from "../../helpers/endGame.js";

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
        try {
            console.log(`Player ${playerId} did not reconnect in time`);

            // remove from active player tracking
            delete activePlayers[playerId];
            delete disconnectTimers[playerId];

            const room = games[roomId];
            if (!room) return;

            // whoever disconnected is the one who lost
            const loser = room.players.find(p => p.id === playerId);
            const winnerColor = loser.is_white ? "b" : "w";

            // end game on forfeit
            if (roomId) {
                io.to(roomId).emit("winLossGameOver", {
                    winner: winnerColor,
                    by: "player forefeit",
                    whiteEloChange,
                    blackEloChange,
                });
            }

            // store finished game
            const gameResult = loser.is_white ? "BLACK_WINS" : "WHITE_WINS";
            finishAndRecordGame(
                roomId,
                games,
                activePlayers,
                white_elo_change,
                black_elo_change,
                "player forefeit",
                gameResult
            );
        } catch (error) {
            console.error("Error handling disconnect timeout:", error);
        }
    }, timeoutMs);

    // Custom replacer to handle BigInt serialization
    // const safeStringify = (obj) =>
    //     JSON.stringify(obj, (_key, value) =>
    //         typeof value === "bigint" ? value.toString() : value
    //     );

    console.log(`${Object.keys(games).length} active games`);
    console.log(`Active players: ${Object.keys(activePlayers)}`);

}

export default disconnect;