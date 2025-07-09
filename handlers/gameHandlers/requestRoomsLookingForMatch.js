import { GAME_STATES } from "../../constants/index.js";

const requestRoomsLookingForMatch = (socket, rooms) => (callback) => {
    console.log(`Player ${socket.data.playerId} is requesting rooms looking for match`);

    const matchingRooms = Object.entries(rooms)
        .filter(([_, room]) => room.game_state === GAME_STATES.matching)
        .map(([roomId, room]) => ({
            id: roomId,
            elo: room.players[0].elo,
            time_control: room.time_control
        }));
    
    console.log(`Found ${matchingRooms.length} rooms looking for match`);

    return callback({
        success: true,
        rooms: matchingRooms
    });
};

export default requestRoomsLookingForMatch;
