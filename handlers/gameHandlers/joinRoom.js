const { Chess } = require("chess.js");
const { GAME_STATES } = require("../../constants/gameStates");
const { CountdownTimer, randomlyFillBombs } = require("../../helpers");
const { 
    ActiveGame,
    User
} = require("../../models");

module.exports = (socket, io) => async (gameId, playerId, playerIsGuest, callback) => {
    console.log(`User ${playerId} is trying to join game ${gameId}...`);
    const game = await ActiveGame.findOne({ game_id: gameId });

    if (!game) {
        // game no longer exists
        return callback({
            success: false,
            message: "Room no longer exists. Please try refreshing."
        });
    } else if (game.players.length >= 2) {
        // game is full
        console.log(`User ${playerId} is trying to join a full game: ${gameId}`)
        return callback({
            success: false,
            message: "Room is full. Please try another room."
        });
    } else if (game.players.some(player => player.id === playerId)) {
        // for some reason, double registered the same player
        return callback({
            success: false,
            message: "You can't join a room you're already in."
        });
    };

    // everything checks out - let's pair them for a game!
    let elo = 1500; // default value

    if (!playerIsGuest) {
        const user = await User.findOne({ username: playerId });
        if (user) {
            elo = user.elo;
        } else {
            console.warn(`Non-guest player ${playerId} not found in user collection.`);
        }
    }

    game.players.push({
        id: playerId,
        is_guest: userIsGuest,
        is_white: !game.players[0].is_white,
        bombs: [],
        elo: 1500,
        seconds_left: game.time_control,
        timer: {
            startTime: null,
            duration: game.time_control
        }
    });

    game.game_state = GAME_STATES.placing_bombs;

    await game.save();

    console.log(`Player ${game.players[1].user_id} is white: ${game.players[1].is_white}.`)

    // different starting positions to test with!
    // const twoRooksOneKing = "8/8/8/8/8/8/4k3/K2R4 w - - 0 1";
    // const customFen = "6k1/8/4q3/6r1/1K6/6r1/8/8 w - - 0 1";

    game.game = new Chess();
    game.game_state = GAME_STATES.placing_bombs;

    socket.join(gameId);
    activePlayers[playerId] = gameId;
    console.log(`User ${playerId} is matched, joining game ${gameId}`);

    // start timer - 1 minute to place bombs
    const secsToPlaceBomb = 60;
    // await redis.set(`bomb_timer:${gameId}`, "", { ex: secsToPlaceBomb });

    // technically, don't need to assign the bomb_timer to the game but for now we will
    // game.bomb_timer = new CountdownTimer(secsToPlaceBomb, () => {
    //     if (game && game.game_state === GAME_STATES.placing_bombs) {
    //         // someone hasn't finished placing bombs yet! so we place them for them, and start the game!
    //         [whitePlayerBombs, blackPlayerBombs] = randomlyFillBombs(game);
    //         io.to(gameId).emit("startPlay", { whitePlayerBombs, blackPlayerBombs });
    //         game.game_state = GAME_STATES.playing;
    //     } else {
    //         console.log(`Bomb timer for ${gameId} went off, but either game ended or everyone already placed bombs.`);
    //     }
    // });
    // game.bomb_timer.start();
    // console.log(`Set a bomb timer for game ${gameId}`);

    io.to(gameId).emit("gameJoined", {
        gameId,
        message: "Both players joined. Game can start!",
        players: game.players,
        fen: game.game.fen(),
        secsToPlaceBomb,
        secsToPlay: game.time_control,
    });
};
