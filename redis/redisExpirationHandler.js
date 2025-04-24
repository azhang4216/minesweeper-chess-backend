const { GAME_STATES } = require("../socket/gameStates");

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
module.exports = function handleRedisExpiration(io, games, activePlayers) {
    return (pattern, channel, message) => {
        console.log(`Redis key expired: ${pattern}; ${channel}, ${message}`);

        const splitMessage = message.split(":");
        const messageType = splitMessage[0];

        switch (messageType) {
            case "bomb_timer":
                const roomId = splitMessage[1];
                const room = games[roomId];

                if (!room) {
                    console.log(`Room ${roomId} doesn't exist in games.`);
                    break;
                };

                // first, we stop players from being able to place bombs by setting game to a different setting
                room.game_state = GAME_STATES.playing;

                // second, let's randomly get the other bombs!
                [whitePlayerBombs, blackPlayerBombs] = fillBombs(games, roomId);
                if (whitePlayerBombs === null | blackPlayerBombs === null) {
                    console.log(`Couldn't fill bombs. Maybe couldn't find the roomId ${roomId} in games?`);
                } else {
                    console.log(`Randomized white player bombs: ${whitePlayerBombs}`);
                    console.log(`Randomized black player bombs: ${blackPlayerBombs}`);
                    io.emit("startPlay", { whitePlayerBombs, blackPlayerBombs });
                };
                break;
            
            case "player_timeout":
                console.log("player timed out");
                io.emit("playerTimedOut");
                break;
            default:
                console.warn("Unknown expiration key:", message);
        }
    };
};
