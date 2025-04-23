const joinRoom = require("./handlers/joinRoom");
const placeBomb = require("./handlers/placeBomb");
const makeMove = require("./handlers/makeMove");
const disconnect = require("./handlers/disconnect");

module.exports = function registerGameHandlers(socket, io, games, activePlayers) {
    socket.on("joinRoom", joinRoom(socket, io, games, activePlayers));
    socket.on("placeBomb", placeBomb(socket, io, games, activePlayers));
    socket.on("makeMove", makeMove(socket, io, games, activePlayers));
    socket.on("disconnect", disconnect(socket, io, games, activePlayers));
};
