const joinRoom = require("./handlers/joinRoom");
const placeBomb = require("./handlers/placeBomb");
const makeMove = require("./handlers/makeMove");
const disconnect = require("./handlers/disconnect");

module.exports = function registerGameHandlers(socket, io, rooms, activePlayersrooms) {
    socket.on("joinRoom", joinRoom(socket, io, rooms, activePlayersrooms));
    socket.on("placeBomb", placeBomb(socket, io, rooms, activePlayersrooms));
    socket.on("makeMove", makeMove(socket, io, rooms, activePlayersrooms));
    socket.on("disconnect", disconnect(socket, io, rooms, activePlayersrooms));
    socket.on("playerDisconnect", disconnect(socket, io, rooms, activePlayersrooms));
};
