import { GAME_STATES } from "../../constants/index.js";
import { userController } from "../../controllers/index.js";

const createRoom = (socket, games, activePlayers) => async ({roomId, timeControl}, callback) => {
    const playerId = socket.data.playerId;
    console.log(`User ${playerId} is trying to create room ${roomId} with ${timeControl} second time control.`);

    if (roomId in games) {
        return callback({
            success: false,
            message: "Room ID already exists. Please choose a different one."
        });
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

    const playerElo = await userController.getUserElo(playerId);

    // valid room creation request: let's create a new room!
    games[roomId] = {
        players: [
            {
                // TODO: replace id when authentication done for persistence
                user_id: playerId,
                is_white: Math.random() < 0.5, // 50% change of being either or
                bombs: [],
                elo: playerElo || 1500,
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