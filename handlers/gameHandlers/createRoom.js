import { GAME_STATES } from "../../constants/index.js";
import { userController } from "../../controllers/index.js";

const createRoom = (socket, games, activePlayers) => async ({roomId, timeControl}, callback) => {
    const playerId = socket.data.playerId;
    if (!playerId) {
        return callback({
            success: false,
            message: "Player not authenticated"
        });
    }
    console.log(`User ${playerId} is trying to create room ${roomId} with ${timeControl} second time control.`);

    if (roomId in games) {
        return callback({
            success: false,
            message: "Room ID already exists. Please choose a different one."
        });
    }

    if (activePlayers[playerId]) {
        // player is already in a game!
        return callback({
            success: false,
            message: "You are either already in a game or have created an active, pending game."
        })
    }

    const secsToPlay = parseInt(timeControl);
    if (!secsToPlay) {
        // this shouldn't happen
        // it means for some reason the options for time sent over are not string / int of valid ints
        return callback({
            success: false,
            message: "Invalid time control."
        });
    }

    const player = await userController.getUserByUsername(playerId);

    // valid room creation request: let's create a new room!
    games[roomId] = {
        players: [
            {
                user_id: playerId,
                username: player ? player.username : "Guest Player",
                is_white: Math.random() < 0.5, // 50% change of being either or
                bombs: [],
                elo: player ? player.elo : 1500,
                // we will add the timer later, when the second player joins
            }
        ],
        game_state: GAME_STATES.matching,
        time_control: secsToPlay
    };

    activePlayers[playerId] = roomId;

    socket.join(roomId);
    console.log(`User ${playerId} started a new room ${roomId}, and is assigned white: ${games[roomId].players[0].is_white}`);
    
    return callback({
        success: true,
        message: "Room created. Waiting for opponent..."
    });
};

export default createRoom;