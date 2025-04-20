const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const { Chess } = require("chess.js");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // in dev only, be careful in prod!
    },
});

const GAME_STATES = {
    matching: "MATCHING",
    placing_bombs: "PLACING_BOMBS",
    playing: "PLAYING"
}

// TODO: users log in & authentication 

// TODO: migrate to database
/* 
    room_id: {
        id: room_id,
        players: [
            {
                id: string,
                is_white: boolean,
                bombs: []
            },
            {
                id: string,
                is_white: boolean,
                bombs: []
            }
        ]
        game: Chess object,
        game_state: "MATCHING", "PLACING_BOMBS", "PLAYING"
    }
*/
const games = {};

// key: socket id, val: room id assigned
const activePlayers = {};  // includes people playing and people in the queue

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinRoom", (roomId) => {
        console.log(`User ${socket.id} is trying to join room ${roomId}...`);
        const room = games[roomId];

        if (!room) {
            // create a new room
            games[roomId] = {
                players: [
                    {
                        // TODO: replace id when authentication done for persistence
                        user_id: socket.id,
                        is_white: Math.random() < 0.5, // 50% change of being either or
                        bombs: []
                    }
                ],
                game_state: GAME_STATES.matching
            };

            activePlayers[socket.id] = roomId;

            socket.join(roomId);
            console.log(`User ${socket.id} started a new room ${roomId}`)
            socket.emit("roomCreated", { roomId, message: "Room created. Waiting for opponent..." });
            return;

        } else if (room.players.length >= 2) {
            // room is full
            console.log(`User ${socket.id} is trying to join a full room: ${roomId}`)
            socket.emit("roomJoinError", { reason: "ROOM_FULL", message: "Room is full." });
            return;

        }

        // let's pair them for a game!
        room.players.push({
            user_id: socket.id,
            is_white: !room.players[0].is_white,
            bombs: []
        });
        room.game = new Chess();
        room.game_state = GAME_STATES.placing_bombs;

        socket.join(roomId);
        activePlayers[socket.id] = roomId;
        console.log(`User ${socket.id} is matched, joining room ${roomId}`);

        room.game_state = GAME_STATES.placing_bombs;

        io.to(roomId).emit("roomJoined", {
            roomId,
            message: "Both players joined. Game can start!",
            players: room.players,
            fen: room.game.fen()
        });
    });

    socket.on("placeBomb", (square) => {
        const roomId = activePlayers[socket.id];
        const room = games[roomId];
        if (room.game_state = GAME_STATES.placing_bombs) {
            const player = (room.players[0].user_id === socket.id) ? room.players[0] : room.players[1];
            const isWhite = player.is_white;
            // TODO: send error messages instead of just console logging
            if (player.bombs.length < 3) {
                if (((isWhite && (square[1] === '3' || square[1] === '4')) || (!isWhite && (square[1] === '5' || square[1] === '6'))) && !(player.bombs.includes(square))) {
                    player.bombs.push(square);
                    console.log(`User ${socket.id} from room ${roomId} placed a bomb on ${square}.`);

                    // tell everyone in the game about this update
                    io.to(roomId).emit("bombPlaced", square);

                    // check to see if we have finished placing bombs, so then we move onto the game
                    if (room.players[0].bombs.length + room.players[1].bombs.length === 6) {
                        room.game_state = GAME_STATES.playing;
                        console.log(`Finished bomb placements for room ${roomId}.`);
                        io.to(roomId).emit("startPlay");
                    }
                } else {
                    console.log(`User ${socket.id} from room ${roomId}, as ${isWhite ? "white" : "black"}, cannot place a bomb on ${square}.`);
                }
            } else {
                console.log(`User ${socket.id} from room ${roomId} has already placed all 3 bombs.`);
            }
        } else {
            console.log(`User ${socket.id} from room ${roomId} is trying to place bombs when they're not supposed to.`)
        }
    });

    socket.on("makeMove", ({ from, to, promotion }) => {
        const roomId = activePlayers[socket.id];
        const room = games[roomId];

        console.log(`${socket.id} trying to make move: ${from} to ${to}.`);

        if (room.game_state === GAME_STATES.playing) {
            const move = room.game.move({ from, to, promotion });
            console.log(room.game.fen());
            if (move) {
                // figure out if we need to treat it specially
                let specialMove = null;

                // also there are: move.isEnPassant?.(), move.isBigPawn?.() which is for double pawn move
                if (room.game.isCheckmate?.()) {
                    specialMove = "checkmate";
                } else if (room.game.isStalemate?.()) {
                    specialMove = "stalemate";
                } else if (room.game.isDraw?.()) {
                    specialMove = "draw";
                } else if (room.game.isDrawByFiftyMoves?.()) {
                    specialMove = "draw by 50-move rule";
                } else if (room.game.isThreefoldRepetition?.()) {
                    specialMove = "threefold repetition";
                } else if (room.game.isInsufficientMaterial?.()) {
                    specialMove = "insufficient material";
                } else if (room.game.in_check?.()) {
                    specialMove = "in check";
                } else if (move.isCapture?.() || move.isEnPassant?.()) {
                    specialMove = "capture";
                } else if (move.isPromotion?.()) {
                    specialMove = "promotion";
                } else if (move.isKingsideCastle?.() || move.isQueensideCastle?.()) {
                    specialMove = "kingside castle";
                }

                // broadcast to both players this move
                console.log(room.game.fen());
                io.to(roomId).emit("gameState", {
                    gameFen: room.game.fen(),
                    moveSan: move.san,
                    specialMove,
                    sideToMoveNext: room.game.fen(),
                });
            } else {
                // only need to broadcast to person who made invalid move
                socket.emit("invalidMove");
            }
        } else {
            console.log(`Room ${roomId}, player ${socket.id}: cannot move pieces when not in a playing game state.`);
        }

    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        if (socket.id in activePlayers) {
            const roomId = activePlayers[socket.id];

            games[roomId]["players"].forEach((player, _index, _array) => {
                delete activePlayers[player.user_id];
                console.log(`Removed player ${player.user_id}, room ${roomId}, from active players.`);
            });

            // TODO: persistent game recording in DB
            delete games[roomId];

            io.to(roomId).emit("playerDisconnected", {
                roomId,
                message: `Player ${socket.id} disconnected from game room ${roomId}.`
            });

            console.log(`Active games: ${JSON.stringify(games)}`);
            console.log(`Active players: ${JSON.stringify(activePlayers)}`);
        }
    });
});

server.listen(4000, () => console.log("Server running on port 4000"));
