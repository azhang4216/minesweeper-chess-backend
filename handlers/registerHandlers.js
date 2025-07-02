// game handlers
const cancelRoom = require("./gameHandlers/cancelRoom");
const createRoom = require("./gameHandlers/createRoom");
const joinRoom = require("./gameHandlers/joinRoom");
const placeBomb = require("./gameHandlers/placeBomb");
const makeMove = require("./gameHandlers/makeMove");

// game match handlers
const disconnect = require("./gameHandlers/disconnect");
const requestRoomsLookingForMatch = require("./gameHandlers/requestRoomsLookingForMatch");

// login / reconnection handlers
// const login = require("./loginHandlers")
const rejoinRoom = require("./loginHandlers/rejoinRoom");

module.exports = function registerHandlers(socket, io, rooms, activePlayerRooms, disconnectTimers, timeoutTimers) {
    // register game handlers
    socket.on("joinRoom", joinRoom(socket, io, rooms, activePlayerRooms));
    socket.on("placeBomb", placeBomb(socket, io, rooms, activePlayerRooms));
    socket.on("makeMove", makeMove(socket, io, rooms, activePlayerRooms));
    socket.on("playerDisconnect", disconnect(socket, io, rooms, activePlayerRooms));
    socket.on("cancelRoom", cancelRoom(socket, rooms, activePlayerRooms));
    socket.on("createRoom", createRoom(socket, rooms, activePlayerRooms));
    socket.on("disconnect", disconnect(socket, io, rooms, activePlayerRooms, disconnectTimers));
    socket.on("requestRoomsLookingForMatch", requestRoomsLookingForMatch(socket, rooms));

    // register rejoin / reconnection handlers
    socket.on("rejoin", rejoinRoom(socket, activePlayerRooms, disconnectTimers));
};
