// game handlers
const cancelRoom = require("./gameHandlers/cancelRoom");
const createRoom = require("./gameHandlers/createRoom");
const joinRoom = require("./gameHandlers/joinRoom");
const placeBomb = require("./gameHandlers/placeBomb");
const makeMove = require("./gameHandlers/makeMove");

// game match handlers
const disconnect = require("./gameHandlers/disconnect");
const requestRoomsLookingForMatch = require("./gameHandlers/requestRoomsLookingForMatch");

module.exports = function registerHandlers(socket, io) {
    // register game handlers
    socket.on("joinRoom", joinRoom(socket, io));
    socket.on("placeBomb", placeBomb(io));
    socket.on("makeMove", makeMove(socket, io));
    socket.on("playerDisconnect", disconnect(socket, io));
    socket.on("cancelRoom", cancelRoom(socket, io));
    socket.on("createRoom", createRoom(socket, io));
    socket.on("disconnect", disconnect(socket, io));
    socket.on("requestRoomsLookingForMatch", requestRoomsLookingForMatch(socket, rooms));
};
