const joinRoom = require("./handlers/joinRoom");
const placeBomb = require("./handlers/placeBomb");
const makeMove = require("./handlers/makeMove");
const disconnect = require("./handlers/disconnect");

module.exports = function registerGameHandlers(socket, io, redis) {
    socket.on("joinRoom", joinRoom(socket, io, redis));
    socket.on("placeBomb", placeBomb(socket, io, redis));
    socket.on("makeMove", makeMove(socket, io, redis));
    socket.on("disconnect", disconnect(socket, io, redis));
};