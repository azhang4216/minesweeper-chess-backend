const {
    // Chess,
    // Piece,
    WHITE,
    BLACK,
    KING,
    // QUEEN,
    // KNIGHT,
    // PAWN, 
} = require("chess.js");
const { GAME_STATES } = require("../gameStates");
const { calculateElo, CountdownTimer } = require("../../helpers");

// const handleTimerLogic = async (io, redis, roomId, room, isPlayerWhoJustMovedWhite, indexOfPlayerWhoJustMoved) => {
//     const timerKeyOfPlayerWhoJustMoved = `player_timer:${roomId}:${isPlayerWhoJustMovedWhite ? "white" : "black"}`;

//     // since this player made their move, we first stop their clock and check how much time they have left
//     const timeLeftForPlayerWhoJustMoved = await redis.ttl(timerKeyOfPlayerWhoJustMoved);
//     room.players[indexOfPlayerWhoJustMoved].seconds_left = timeLeftForPlayerWhoJustMoved;

//     // this player doesn't need to time out => remove their timeout key
//     const valOfTimerKeyOfPlayerWhoJustMoved = await redis.getdel(timerKeyOfPlayerWhoJustMoved); 
//     if (valOfTimerKeyOfPlayerWhoJustMoved === "") {
//         console.log(`Successfully deleted key ${timerKeyOfPlayerWhoJustMoved}`);
//     } else {
//         console.log(`Could not find key ${timerKeyOfPlayerWhoJustMoved}`);
//     };

//     console.log(`There is ${timeLeftForPlayerWhoJustMoved} seconds left for the player who just moved in room ${roomId}.`);

//     // now, after server logic, we start the next player's timer
//     const timerKeyOfPlayerAboutToMove = `player_timer:${roomId}:${isPlayerWhoJustMovedWhite ? "black" : "white"}`;
//     const timeLeftForPlayerAboutToMove = room.players[indexOfPlayerWhoJustMoved === 0 ? 1 : 0].seconds_left;
//     console.log(`There is ${timeLeftForPlayerAboutToMove} seconds left for the player about to move in room ${roomId}.`);

//     if (timeLeftForPlayerAboutToMove > 0) {
//         await redis.set(timerKeyOfPlayerAboutToMove, "", { ex: timeLeftForPlayerAboutToMove });
//     } else {
//         console.log(`Cannot set a non-positive ttl for room ${roomId}`);
//     };

//     // tell the connected sockets about our updated times for syncing!
//     io.to(roomId).emit("syncTime", {
//         whiteTimeLeft: isPlayerWhoJustMovedWhite ? timeLeftForPlayerWhoJustMoved : timeLeftForPlayerAboutToMove,
//         blackTimeLeft: isPlayerWhoJustMovedWhite ? timeLeftForPlayerAboutToMove : timeLeftForPlayerWhoJustMoved
//     });
// };


module.exports = (socket, io, games, activePlayers) => ({ from, to, promotion }) => {
    const roomId = activePlayers[socket.id];
    if (!roomId) return;

    const room = games[roomId];
    if (!room) return;

    console.log(`${socket.id} trying to make move: ${from} to ${to}.`);

    if (room.game_state === GAME_STATES.playing) {
        let move = null;

        try {
            move = room.game.move({ from, to, promotion });
        } catch (_e) {
            console.log("tried to make illegal move");
            return;
        }

        // now that we know it's a valid move, let's see if the timer has started
        if (!("timer" in room.players[0])) {
            // we need to set timers and start them for our players!
            room.players.forEach((player) => {
                player.timer = new CountdownTimer(room.time_control, () => {
                    if (room.game_state === GAME_STATES.playing) {
                        const winnerColor = player.is_white ? "b" : "w";
                        const [whiteEloChange, blackEloChange] = calculateElo(
                            (room.players[0].is_white) ? room.players[0].elo : room.players[1].elo,
                            (room.players[0].is_white) ? room.players[1].elo : room.players[0].elo,
                            (winnerColor === "w") ? 1 : 0,
                        );

                        room.game_state = GAME_STATES.game_over;

                        io.to(roomId).emit("winLossGameOver", {
                            winner: winnerColor,
                            by: "timeout",
                            whiteEloChange,
                            blackEloChange,
                        });

                        console.log(`Room ${roomId}: ${winnerColor} wins by timeout.`);
                    } else {
                        console.log(`Room ${roomId}: player timer went off, but game is no longer being played.`);
                    }

                });
            });
        }

        const preExplosionFen = room.game.fen();  // for explosion animation purposes

        const indexOfPlayerWhoJustMoved = (room.players[0].user_id === socket.id) ? 0 : 1;
        const isPlayerWhoJustMovedWhite = room.players[indexOfPlayerWhoJustMoved].is_white;

        // stop the timer of the person who just moved
        room.players[indexOfPlayerWhoJustMoved].timer.pause();

        // run timer logic in parallel for less delay - no need to wait for it to finish before moving on
        // handleTimerLogic(io, redis, roomId, room, isPlayerWhoJustMovedWhite, indexOfPlayerWhoJustMoved);

        if (move) {
            // special move tells us if we need to play sound effects or take specific actions accordingly
            // note: special move does NOT handle any game-ending moves
            let specialMove = null;

            // also there are: move.isEnPassant?.(), move.isBigPawn?.() which is for double pawn move
            if (room.players[0].bombs.includes(to) || room.players[1].bombs.includes(to)) {
                specialMove = `explode ${to}`;

                // get rid of detonated bomb
                const player = room.players[0].bombs.includes(to)
                    ? room.players[0]
                    : room.players[1];
                player.bombs = player.bombs.filter(bomb => bomb !== to);

                // remove the piece that set off that bomb
                room.game.remove(to);
            } else if (room.game.inCheck?.()) {
                specialMove = "in check";
            } else if (move.isCapture?.() || move.isEnPassant?.()) {
                specialMove = "capture";
            } else if (move.isPromotion?.()) {
                specialMove = "promotion";
            } else if (move.isKingsideCastle?.() || move.isQueensideCastle?.()) {
                specialMove = "castle";
            }

            // broadcast to both players this move
            io.to(roomId).emit("gameState", {
                gameFen: room.game.fen(),
                moveSan: move.san + (specialMove && specialMove.startsWith("explode") ? "💣💥" : ""),
                specialMove,
                sideToMoveNext: room.game.turn(),
                preExplosionFen   // different from gameFen only if explosion happened
            });

            const isWhiteKingMissing = room.game.findPiece({ type: KING, color: WHITE }).length == 0;
            const isBlackKingMissing = room.game.findPiece({ type: KING, color: BLACK }).length == 0;

            console.log(`White king is missing: ${isWhiteKingMissing}`);
            console.log(`Black king is missing: ${isBlackKingMissing}`);
            console.log(`Special move: ${specialMove}`);

            // 
            /* 
            tell players if this resulted in a game over move!
            -> note: needed a CUSTOM way to check if game is over
                     because exploded squares & missing king both cause null assignment error
            */
            if (specialMove && specialMove.startsWith("explode")) {
                // there are 2 ways in which an explosion could cause a game over
                if (isWhiteKingMissing || isBlackKingMissing) {
                    // case 1. king stepped into a bomb => game over
                    const winnerColor = isWhiteKingMissing ? "b" : "w";
                    const [whiteEloChange, blackEloChange] = calculateElo(
                        (room.players[0].is_white) ? room.players[0].elo : room.players[1].elo,
                        (room.players[0].is_white) ? room.players[1].elo : room.players[0].elo,
                        (winnerColor === "w") ? 1 : 0,
                    );

                    room.game_state = GAME_STATES.game_over;

                    console.log(`Room ${roomId} ended by king exploding. ${winnerColor} won.`);

                    io.to(roomId).emit("winLossGameOver", {
                        winner: winnerColor,
                        by: "king exploded?!",
                        whiteEloChange,
                        blackEloChange,
                    });
                } else if (room.game.isInsufficientMaterial()) {
                    console.log("Draw by insufficient material (blew up)");
                    // case 2. a non-king piece stepped into a bomb => draw by insufficient material
                    // note: documentation checks piece by piece so exploded bomb shouldn't affect it
                    const [whiteEloChange, blackEloChange] = calculateElo(
                        (room.players[0].is_white) ? room.players[0].elo : room.players[1].elo,
                        (room.players[0].is_white) ? room.players[1].elo : room.players[0].elo,
                        0.5
                    );

                    room.game_state = GAME_STATES.game_over;

                    io.to(roomId).emit("drawGameOver", {
                        by: "insufficient material (a piece exploded!)",
                        whiteEloChange,
                        blackEloChange,
                    });
                }
            } else if (isWhiteKingMissing || isBlackKingMissing) {
                const winnerColor = isBlackKingMissing ? "w" : "b";
                const [whiteEloChange, blackEloChange] = calculateElo(
                    (room.players[0].is_white) ? room.players[0].elo : room.players[1].elo,
                    (room.players[0].is_white) ? room.players[1].elo : room.players[0].elo,
                    (winnerColor === "w") ? 1 : 0,
                );

                room.game_state = GAME_STATES.game_over;

                io.to(roomId).emit("winLossGameOver", {
                    winner: winnerColor,
                    by: "king captured", // could say "checkmate"
                    whiteEloChange,
                    blackEloChange,
                });
            } else if (room.game.isGameOver()) {
                // a "usual" game over, so no "null" references
                if (room.game.isDraw?.()) {
                    const [whiteEloChange, blackEloChange] = calculateElo(
                        (room.players[0].is_white) ? room.players[0].elo : room.players[1].elo,
                        (room.players[0].is_white) ? room.players[1].elo : room.players[0].elo,
                        0.5
                    );

                    io.to(roomId).emit("drawGameOver", {
                        by: room.game.isDrawByFiftyMoves?.() && "50-move rule" ||
                            room.game.isThreefoldRepetition?.() && "threefold repetition" ||
                            room.game.isInsufficientMaterial?.() && "insufficient material" ||
                            room.game.isStalemate?.() && "stalemate" ||
                            null, // technically, should never be null
                        whiteEloChange,
                        blackEloChange,
                    });
                } else {          // someone won, and someone lost
                    // in regular chess, whoever moves last for checkmate is winner
                    const winnerColor = isPlayerWhoJustMovedWhite ? "w" : "b";

                    const [whiteEloChange, blackEloChange] = calculateElo(
                        (room.players[0].is_white) ? room.players[0].elo : room.players[1].elo,
                        (room.players[0].is_white) ? room.players[1].elo : room.players[0].elo,
                        (winnerColor === "w") ? 1 : 0,
                    );

                    io.to(roomId).emit("winLossGameOver", {
                        winner: winnerColor,
                        by: "checkmate",
                        whiteEloChange,
                        blackEloChange,
                    });
                };

                room.game_state = GAME_STATES.game_over;
            };

            // start the timer of the person who is about to move, but only if game is not over
            // if (room.game_state === GAME_STATES.playing) {
            const indexOfPlayerAboutToMove = indexOfPlayerWhoJustMoved === 1 ? 0 : 1;
            room.players[indexOfPlayerAboutToMove].timer.start();

            // sync their timers
            const whiteTimeLeft = room.players[0].is_white ? room.players[0].timer.getTimeLeft() : room.players[1].timer.getTimeLeft();
            const blackTimeLeft = room.players[0].is_white ? room.players[1].timer.getTimeLeft() : room.players[0].timer.getTimeLeft();
            console.log(`White has ${whiteTimeLeft}s; black has ${blackTimeLeft}s.`);
            io.to(roomId).emit("syncTime", { whiteTimeLeft, blackTimeLeft });
            // };
        } else {
            // only need to broadcast to person who made invalid move
            socket.emit("invalidMove");
        }
    } else {
        console.log(`Room ${roomId}, player ${socket.id}: cannot move pieces when not in a playing game state.`);
    }
}