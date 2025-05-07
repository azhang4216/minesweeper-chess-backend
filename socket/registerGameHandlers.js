const cancelRoom = require("./handlers/cancelRoom");
const createRoom = require("./handlers/createRoom");
const joinRoom = require("./handlers/joinRoom");
const placeBomb = require("./handlers/placeBomb");
const makeMove = require("./handlers/makeMove");
const disconnect = require("./handlers/disconnect");
const requestRoomsLookingForMatch = require("./handlers/requestRoomsLookingForMatch");

module.exports = function registerGameHandlers(socket, io, redis) {
    socket.on("joinRoom", joinRoom(socket, io, redis));
    socket.on("placeBomb", placeBomb(socket, io, redis));
    socket.on("makeMove", makeMove(socket, io, redis));
    socket.on("disconnect", disconnect(socket, io, redis));
    socket.on("playerDisconnect", disconnect(socket, io, redis));
    socket.on("cancelRoom", cancelRoom(socket, redis));
    socket.on("createRoom", createRoom(socket, redis));
    socket.on("requestRoomsLookingForMatch", requestRoomsLookingForMatch(redis));
};
