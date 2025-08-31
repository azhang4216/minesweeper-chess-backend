// game handlers
import cancelRoom from "./gameHandlers/cancelRoom.js";
import createRoom from "./gameHandlers/createRoom.js";
import joinRoom from "./gameHandlers/joinRoom.js";
import placeBomb from "./gameHandlers/placeBomb.js";
import makeMove from "./gameHandlers/makeMove.js";

// game match handlers
import disconnect from "./gameHandlers/disconnect.js";
import requestRoomsLookingForMatch from "./gameHandlers/requestRoomsLookingForMatch.js";

// login / reconnection handlers
import rejoinRoom from "./loginHandlers/rejoinRoom.js";

const registerHandlers = function (socket, io, rooms, activePlayers, disconnectTimers, timeoutTimers) {
    // register game handlers
    socket.on("joinRoom", joinRoom(socket, io, rooms, activePlayers));
    socket.on("placeBomb", placeBomb(socket, io, rooms, activePlayers));
    socket.on("makeMove", makeMove(socket, io, rooms, activePlayers));
    socket.on("playerDisconnect", disconnect(socket, io, rooms, activePlayers));
    socket.on("cancelRoom", cancelRoom(socket, rooms, activePlayers));
    socket.on("createRoom", createRoom(socket, rooms, activePlayers));
    socket.on("disconnect", disconnect(socket, io, rooms, activePlayers, disconnectTimers));
    socket.on("requestRoomsLookingForMatch", requestRoomsLookingForMatch(socket, rooms));

    // register join / reconnection handlers
    socket.on("rejoin", rejoinRoom(socket, activePlayers, disconnectTimers));
    socket.on("authenticate", ({ playerId }) => {
        socket.data.playerId = playerId;
        console.log("Socket authenticated as", playerId);

        // if player has an active game, rejoin their room
        const roomId = activePlayers[playerId];
        if (roomId) {
            console.log(`Player ${playerId} has an active game in room ${roomId}`);
            delete activePlayers[playerId];
            socket.join(roomId);
            if (disconnectTimers[playerId]) {
                clearTimeout(disconnectTimers[playerId]);
                delete disconnectTimers[playerId];
            }
            // Update user_id and username in the room's players array
            const room = rooms[roomId];
            if (room && Array.isArray(room.players)) {
                const playerObj = room.players.find(p => p.user_id === playerId);
                if (playerObj) {
                    playerObj.user_id = playerId;
                    playerObj.username = playerId;
                }
            }
            io.to(roomId).emit("playerReconnected", {
                reconnectedPlayerId: playerId,
                message: `Player ${playerId} reconnected to game room ${roomId}.`
            });
        }
    });
};

export default registerHandlers;