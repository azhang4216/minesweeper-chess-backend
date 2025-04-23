const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const registerGameHandlers = require("./socket/registerGameHandlers");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" },
});

// TODO: migrate these to a database
/* 
    room_id: {
        id: room_id,
        players: [
            {
                id: string,
                is_white: boolean,
                bombs: [],
                elo: int
            },
            {
                id: string,
                is_white: boolean,
                bombs: [],
                elo: int
            }
        ]
        game: Chess object,
        game_state: "MATCHING", "PLACING_BOMBS", "PLAYING"
    }
*/
const games = {};

// key: socket id, val: room id assigned
const activePlayers = {};    // includes people playing and people in the queue

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    registerGameHandlers(socket, io, games, activePlayers);
});

module.exports = { server };
