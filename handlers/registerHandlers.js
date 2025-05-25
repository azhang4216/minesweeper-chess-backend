// game handlers
const cancelRoom = require("./gameHandlers/cancelRoom");
const createRoom = require("./gameHandlers/createRoom");
const joinRoom = require("./gameHandlers/joinRoom");
const placeBomb = require("./gameHandlers/placeBomb");
const makeMove = require("./gameHandlers/makeMove");

// game match handlers
const disconnect = require("./gameHandlers/disconnect");
const requestRoomsLookingForMatch = require("./gameHandlers/requestRoomsLookingForMatch");

// login handlers
// const login = require("./loginHandlers")

module.exports = function registerHandlers(socket, io, rooms, activePlayersrooms) {
    // register game handlers
    socket.on("joinRoom", joinRoom(socket, io, rooms, activePlayersrooms));
    socket.on("placeBomb", placeBomb(socket, io, rooms, activePlayersrooms));
    socket.on("makeMove", makeMove(socket, io, rooms, activePlayersrooms));
    socket.on("playerDisconnect", disconnect(socket, io, rooms, activePlayersrooms));
    socket.on("cancelRoom", cancelRoom(socket, io, rooms, activePlayersrooms));
    socket.on("createRoom", createRoom(socket, io, rooms, activePlayersrooms));
    socket.on("disconnect", disconnect(socket, io, rooms, activePlayersrooms));
    socket.on("requestRoomsLookingForMatch", requestRoomsLookingForMatch(socket, rooms));

    // register 
};
