const { GAME_STATES } = require("../socket/gameStates");
const { eloRatingChange } = require("../helpers/calculateElo");

function fillBombs(games, roomId) {
    const room = games[roomId];
    if (!room || !room.players) return;

    room.players.forEach(player => {
        const needed = 3 - player.bombs.length;
        if (needed <= 0) return [null, null];

        const possibleSquares = [];

        const ranks = player.is_white ? ['3', '4'] : ['5', '6'];
        const files = ['a','b','c','d','e','f','g','h'];

        for (const file of files) {
            for (const rank of ranks) {
                const square = file + rank;
                if (!player.bombs.includes(square)) {
                    possibleSquares.push(square);
                }
            }
        }

        // Shuffle the possible squares
        for (let i = possibleSquares.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [possibleSquares[i], possibleSquares[j]] = [possibleSquares[j], possibleSquares[i]];
        }

        // Add the first `needed` squares
        player.bombs.push(...possibleSquares.slice(0, needed));
    });

    // return [white player's bombs, black player's bombs]
    return room.players[0].is_white ? [room.players[0].bombs, room.players[1].bombs] : [room.players[1].bombs, room.players[0].bombs];
};

/**
 * Handles Redis key expiration messages.
 * @param {Server} io - The Socket.IO server instance.
 * @returns {function} - A callback function to handle Redis pmessage events.
 */
module.exports = function handleRedisExpiration(io, redis, games, _activePlayers) {
    return async (pattern, channel, message) => {
        console.log(`Redis key expired: ${pattern}; ${channel}, ${message}`);

        const splitMessage = message.split(":");
        const messageType = splitMessage[0];
        const roomId = splitMessage[1];
        const room = games[roomId];

        if (!room) {
            console.log(`Room ${roomId} doesn't exist in games.`);
            return;
        };

        /* 
        for bomb timer, we have key bomb_timer:roomId
        for player timer, we have key player_timer:roomId:<white||black>, depending on whose move it is
        */

        switch (messageType) {
            case "bomb_timer":
                // first, we stop players from being able to place bombs by setting game to a different setting
                room.game_state = GAME_STATES.playing;

                // second, let's randomly get the other bombs!
                [whitePlayerBombs, blackPlayerBombs] = fillBombs(games, roomId);
                if (whitePlayerBombs === null | blackPlayerBombs === null) {
                    console.log(`Couldn't fill bombs. Maybe couldn't find the roomId ${roomId} in games?`);
                } else {
                    console.log(`Randomized white player bombs: ${whitePlayerBombs}`);
                    console.log(`Randomized black player bombs: ${blackPlayerBombs}`);
                    io.to(roomId).emit("startPlay", { whitePlayerBombs, blackPlayerBombs });
                };

                // third, we start the timer for white to play
                const secondsOnClock = room.time_control;
                const whiteTimerStartKey = `player_timer:${roomId}:white`;
                const numberOfKeysForWhiteTimer = await redis.exists(whiteTimerStartKey);
                console.log(`Redis has white timer key for randomly placed bombs? ${numberOfKeysForWhiteTimer}`);

                if (numberOfKeysForWhiteTimer === 0) {
                    await redis.set(whiteTimerStartKey, "", { ex: secondsOnClock });
                    console.log(`Set white timer start for room ${roomId}`);
                } else {
                    console.log(`White timer start for room ${roomId} already exists`);
                };

                break;
            
            case "player_timer":
                const colorOfPlayerWhoTimedOut = splitMessage[2];
                console.log(`${colorOfPlayerWhoTimedOut} player timed out`);

                const [whiteEloChange, blackEloChange] = eloRatingChange(
                    (room.players[0].is_white) ? room.players[0].elo : room.players[1].elo,
                    (room.players[0].is_white) ? room.players[1].elo : room.players[0].elo,
                    (colorOfPlayerWhoTimedOut === "white") ? 0 : 1,
                );

                room.game_state = GAME_STATES.game_over;

                io.to(roomId).emit("winLossGameOver", {
                    winner: (colorOfPlayerWhoTimedOut === "white") ? "b" : "w",
                    by: "time out",
                    whiteEloChange,
                    blackEloChange,
                });
                break;
            default:
                console.warn("Unknown expiration key:", message);
        }
    };
};
