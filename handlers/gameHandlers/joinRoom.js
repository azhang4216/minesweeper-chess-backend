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

    /* everything checks out - let's pair them for a game! */

    // step 0. some values
    let elo = 1500;             // default value
    const secsToPlaceBomb = 60; // 1 minute

    // step 1. update our game document 
    // step 1a. get the user's actual elo if the user is not a guest
    if (!playerIsGuest) {
        const user = await User.findOne({ username: playerId });
        if (user) {
            elo = user.elo;
        } else {
            console.warn(`Non-guest player ${playerId} not found in user collection.`);
        }
    }

    // step 1b. push new player into our game
    game.players.push({
        id: playerId,
        is_guest: userIsGuest,
        is_white: !game.players[0].is_white,
        bombs: [],
        elo,
        seconds_left: game.time_control
    });

    // step 1c. update game state & save game
    game.game_state = GAME_STATES.placing_bombs;
    await game.save();

    // step 2. update the onlineUser document
    let onlineUser = await OnlineUser.findOne({ player_id: playerId });

    if (!onlineUser) {
        onlineUser = new OnlineUser({
            player_id: playerId,
            is_guest: playerIsGuest,
        }) 
        console.log(`Player ${playerId} is not registered in online users. Making player an online user.`);
    }

    onlineUser.room_id = roomId;
    await onlineUser.save();

    // step 3. join the socket 
    socket.join(gameId);
    console.log(`User ${playerId} is matched, joining game ${gameId}`);

    
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

    // finally, tell the sockets we're ready to start
    io.to(gameId).emit("gameJoined", {
        gameId,
        players: game.players,
        secsToPlaceBomb,
        secsToPlay: game.time_control,
    });
};
