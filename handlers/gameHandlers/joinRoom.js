import { Chess } from "chess.js";
import { GAME_STATES } from "../../constants/index.js";
import { CountdownTimer, randomlyFillBombs } from "../../helpers/index.js";

const joinRoom = (socket, io, games, activePlayers) => (roomId, callback) => {
    const playerId = socket.data.playerId;

    if (!playerId) {
        return callback({
            success: false,
            message: "Player not authenticated" 
        });
    }
    
    console.log(`Player ${playerId} is trying to join room ${roomId}...`);
    
    if (activePlayers[playerId]) {
        // player is already in a game!
        return callback({
            success: false,
            message: "You are either already in a game or have created an active, pending game."
        })
    }
    
    const room = games[roomId];

    if (!room) {
        // room no longer exists
        return callback({
            success: false,
            message: "Room no longer exists. Please try refreshing."
        });
    } else if (room.players.length >= 2) {
        // room is full
        console.log(`User ${playerId} is trying to join a full room: ${roomId}`)
        return callback({
            success: false,
            message: "Room is full. Please try another room."
        });
    } else if (room.players && playerId === room.players[0].user_id) {
        // for some reason, double registered the same player
        console.log(`User ${playerId} is already in room ${roomId}...`);
    };

    // everything checks out - let's pair them for a game!
    room.players.push({
        user_id: playerId,
        is_white: !room.players[0].is_white,
        bombs: [],
        elo: 1500, // TODO: replace with real elo once profiles feature implemented
    });
    console.log(`Player ${room.players[1].user_id} is white: ${room.players[1].is_white}.`)

    // different starting positions to test with!
    // const twoRooksOneKing = "8/8/8/8/8/8/4k3/K2R4 w - - 0 1";
    // const customFen = "6k1/8/4q3/6r1/1K6/6r1/8/8 w - - 0 1";

    room.game = new Chess();
    room.game_state = GAME_STATES.placing_bombs;

    socket.join(roomId);
    activePlayers[playerId] = roomId;
    console.log(`User ${playerId} is matched, joining room ${roomId}`);

    // start timer - 1 minute to place bombs
    const secsToPlaceBomb = 60;
    // await redis.set(`bomb_timer:${roomId}`, "", { ex: secsToPlaceBomb });

    // technically, don't need to assign the bomb_timer to the room but for now we will
    room.bomb_timer = new CountdownTimer(secsToPlaceBomb, () => {
        if (room && room.game_state === GAME_STATES.placing_bombs) {
            // someone hasn't finished placing bombs yet! so we place them for them, and start the game!
            const [whitePlayerBombs, blackPlayerBombs] = randomlyFillBombs(room);
            io.to(roomId).emit("startPlay", { whitePlayerBombs, blackPlayerBombs });
            room.game_state = GAME_STATES.playing;
        } else {
            console.log(`Bomb timer for ${roomId} went off, but either game ended or everyone already placed bombs.`);
        }
    });
    room.bomb_timer.start();

    console.log(`Set a bomb timer for room ${roomId}`);

    io.to(roomId).emit("roomJoined", {
        roomId,
        message: "Both players joined. Game can start!",
        players: room.players,
        fen: room.game.fen(),
        secsToPlaceBomb,
        secsToPlay: room.time_control,
    });
};

export default joinRoom;