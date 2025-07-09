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

const registerHandlers = function(socket, io, rooms, activePlayerRooms, disconnectTimers, timeoutTimers) {
    // register game handlers
    socket.on("joinRoom", joinRoom(socket, io, rooms, activePlayerRooms));
    socket.on("placeBomb", placeBomb(socket, io, rooms, activePlayerRooms));
    socket.on("makeMove", makeMove(socket, io, rooms, activePlayerRooms));
    socket.on("playerDisconnect", disconnect(socket, io, rooms, activePlayerRooms));
    socket.on("cancelRoom", cancelRoom(socket, rooms, activePlayerRooms));
    socket.on("createRoom", createRoom(socket, rooms, activePlayerRooms));
    socket.on("disconnect", disconnect(socket, io, rooms, activePlayerRooms, disconnectTimers));
    socket.on("requestRoomsLookingForMatch", requestRoomsLookingForMatch(socket, rooms));

    // register join / reconnection handlers
    socket.on("rejoin", rejoinRoom(socket, activePlayerRooms, disconnectTimers));
    socket.on("authenticate", ({ playerId }) => {
        socket.data.playerId = playerId;
        console.log("Socket authenticated as", playerId);
    });
};

export default registerHandlers;