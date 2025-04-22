const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const { 
    Chess,
    Piece,
    WHITE,
    BLACK,
    KING,
    QUEEN,
    KNIGHT,
    PAWN, 
} = require("chess.js");

// helper functions
const { eloRatingChange } = require('./helpers/calculateElo');

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
                        bombs: [],
                        elo: 1500,                     // place holder
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
            bombs: [],
            elo: 1500, // placeholder
        });
        room.game = new Chess();

        /* 
        the NEW version is this:
        Chess {
  _board: [
    { type: 'r', color: 'b' },
    { type: 'n', color: 'b' },
    { type: 'b', color: 'b' },
    { type: 'q', color: 'b' },
    { type: 'k', color: 'b' },
    { type: 'b', color: 'b' },
    { type: 'n', color: 'b' },
    { type: 'r', color: 'b' },
    <8 empty items>,
    { type: 'p', color: 'b' },
    { type: 'p', color: 'b' },
    { type: 'p', color: 'b' },
    { type: 'p', color: 'b' },
    { type: 'p', color: 'b' },
    { type: 'p', color: 'b' },
    { type: 'p', color: 'b' },
    { type: 'p', color: 'b' },
    <72 empty items>,
    { type: 'p', color: 'w' },
    { type: 'p', color: 'w' },
    { type: 'p', color: 'w' },
    { type: 'p', color: 'w' },
    { type: 'p', color: 'w' },
    { type: 'p', color: 'w' },
    { type: 'p', color: 'w' },
    { type: 'p', color: 'w' },
    <8 empty items>,
    { type: 'r', color: 'w' },
    { type: 'n', color: 'w' },
    { type: 'b', color: 'w' },
    { type: 'q', color: 'w' },
    { type: 'k', color: 'w' },
    { type: 'b', color: 'w' },
    { type: 'n', color: 'w' },
    { type: 'r', color: 'w' },
    <8 empty items>
  ],
  _turn: 'w',
  _header: {
    Event: '?',
    Site: '?',
    Date: '????.??.??',
    Round: '?',
    White: '?',
    Black: '?',
    Result: '*',
    WhiteTitle: null,
    BlackTitle: null,
    WhiteElo: null,
    BlackElo: null,
    WhiteUSCF: null,
    BlackUSCF: null,
    WhiteNA: null,
    BlackNA: null,
    WhiteType: null,
    BlackType: null,
    EventDate: null,
    EventSponsor: null,
    Section: null,
    Stage: null,
    Board: null,
    Opening: null,
    Variation: null,
    SubVariation: null,
    ECO: null,
    NIC: null,
    Time: null,
    UTCTime: null,
    UTCDate: null,
    TimeControl: null,
    SetUp: null,
    FEN: null,
    Termination: null,
    Annotator: null,
    Mode: null,
    PlyCount: null
  },
  _kings: { w: 116, b: 4 },
  _epSquare: -1,
  _halfMoves: 0,
  _moveNumber: 1,
  _history: [],
  _comments: {},
  _castling: { w: 96, b: 96 },
  _positionCount: { 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': 1 }
}
        */
        /* 
        room.game is this: (v0.12.0)
        {
            WHITE: 'w',
            BLACK: 'b',
            PAWN: 'p',
            KNIGHT: 'n',
            BISHOP: 'b',
            ROOK: 'r',
            QUEEN: 'q',
            KING: 'k',
            SQUARES: [
                'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8',
                'h8', 'a7', 'b7', 'c7', 'd7', 'e7', 'f7',
                'g7', 'h7', 'a6', 'b6', 'c6', 'd6', 'e6',
                'f6', 'g6', 'h6', 'a5', 'b5', 'c5', 'd5',
                'e5', 'f5', 'g5', 'h5', 'a4', 'b4', 'c4',
                'd4', 'e4', 'f4', 'g4', 'h4', 'a3', 'b3',
                'c3', 'd3', 'e3', 'f3', 'g3', 'h3', 'a2',
                'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
                'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1',
                'h1'
            ],
            FLAGS: {
                NORMAL: 'n',
                CAPTURE: 'c',
                BIG_PAWN: 'b',
                EP_CAPTURE: 'e',
                PROMOTION: 'p',
                KSIDE_CASTLE: 'k',
                QSIDE_CASTLE: 'q'
            },
            load: [Function: load],
            reset: [Function: reset],
            moves: [Function: moves],
            in_check: [Function: in_check],
            in_checkmate: [Function: in_checkmate],
            in_stalemate: [Function: in_stalemate],
            in_draw: [Function: in_draw],
            insufficient_material: [Function: insufficient_material],
            in_threefold_repetition: [Function: in_threefold_repetition],
            game_over: [Function: game_over],
            validate_fen: [Function: validate_fen],
            fen: [Function: fen],
            board: [Function: board],
            pgn: [Function: pgn],
            load_pgn: [Function: load_pgn],
            header: [Function: header],
            ascii: [Function: ascii],
            turn: [Function: turn],
            move: [Function: move],
            undo: [Function: undo],
            clear: [Function: clear],
            put: [Function: put],
            get: [Function: get],
            remove: [Function: remove],
            perft: [Function: perft],
            square_color: [Function: square_color],
            history: [Function: history],
            get_comment: [Function: get_comment],
            set_comment: [Function: set_comment],
            delete_comment: [Function: delete_comment],
            get_comments: [Function: get_comments],
            delete_comments: [Function: delete_comments]
            }
        */

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
            let move = null; 
            
            try {
                move = room.game.move({ from, to, promotion });
            } catch (_e) {
                console.log("tried to make illegal move");
            }
            const preExplosionFen = room.game.fen();  // for explosion animation purposes

            // { color: 'w', from: 'e2', to: 'e3', flags: 'n', piece: 'p', san: 'e3' }
            // console.log(move);

            
            if (move) {
                // special move tells us if we need to play sound effects or take specific actions accordingly
                // note: special move does NOT handle any game-ending moves
                let specialMove = null;

                // also there are: move.isEnPassant?.(), move.isBigPawn?.() which is for double pawn move
                if (room.players[0].bombs.includes(to) || room.players[1].bombs.includes(to)) {
                    specialMove = `explode ${to}`;

                    // get rid of detonated bomb
                    const player = room.players[0].bombs.includes(to)
                        ? room.players[0]
                        : room.players[1];
                    player.bombs = player.bombs.filter(bomb => bomb !== to);

                    // remove the piece that set off that bomb
                    room.game.remove(to);
                } else if (room.game.inCheck?.()) {
                    specialMove = "in check";
                } else if (move.isCapture?.() || move.isEnPassant?.()) {
                    specialMove = "capture";
                } else if (move.isPromotion?.()) {
                    specialMove = "promotion";
                } else if (move.isKingsideCastle?.() || move.isQueensideCastle?.()) {
                    specialMove = "castle";
                }

                // broadcast to both players this move
                io.to(roomId).emit("gameState", {
                    gameFen: room.game.fen(),
                    moveSan: move.san + (specialMove && specialMove.startsWith("explode") ? "💣💥" : ""),
                    specialMove,
                    sideToMoveNext: room.game.turn(),
                    preExplosionFen   // different from gameFen only if explosion happened
                });

                const indexOfPlayerWhoJustMoved = (room.players[0].user_id === socket.id) ? 0 : 1;
                const isPlayerWhoJustMovedWhite = room.players[indexOfPlayerWhoJustMoved].is_white;
                const isWhiteKingMissing = room.game.findPiece({ type: KING, color: WHITE }).length == 0;
                const isBlackKingMissing = room.game.findPiece({ type: KING, color: BLACK }).length == 0;

                // 
                /* 
                tell players if this resulted in a game over move!
                -> note: needed a CUSTOM way to check if game is over
                         because exploded squares & missing king both cause null assignment error
                */
                if (specialMove && specialMove.startsWith("explode")) {
                    // there are 2 ways in which an explosion could cause a game over
                    if ((isPlayerWhoJustMovedWhite && isWhiteKingMissing) || (!isPlayerWhoJustMovedWhite && isBlackKingMissing)) {
                        // case 1. king stepped into a bomb => game over
                        //         which means the person who just moved it exploded their king
                        const winnerColor = isPlayerWhoJustMovedWhite ? "b" : "w";
                        const [whiteEloChange, blackEloChange] = eloRatingChange(
                            (room.players[0].is_white) ? room.players[0].elo : room.players[1].elo,
                            (room.players[0].is_white) ? room.players[1].elo : room.players[0].elo,
                            (winnerColor === "w") ? 1 : 0,
                        );
    
                        io.to(roomId).emit("winLossGameOver", {
                            winner: winnerColor,
                            by: "king blowing up?!",
                            whiteEloChange,
                            blackEloChange,
                        });
                    } else if (room.game.isInsufficientMaterial()) {
                        // case 2. a non-king piece stepped into a bomb => draw by insufficient material
                        // note: documentation checks piece by piece so exploded bomb shouldn't affect it
                        const [whiteEloChange, blackEloChange] = eloRatingChange(
                            (room.players[0].is_white) ? room.players[0].elo : room.players[1].elo,
                            (room.players[0].is_white) ? room.players[1].elo : room.players[0].elo,
                            0.5
                        );

                        io.to(roomId).emit("drawGameOver", {
                            by: "insufficient material",
                            whiteEloChange,
                            blackEloChange,
                        });
                    }
                } else if (isWhiteKingMissing || isBlackKingMissing) {
                    const winnerColor = isBlackKingMissing ? "w" : "b";
                    const [whiteEloChange, blackEloChange] = eloRatingChange(
                        (room.players[0].is_white) ? room.players[0].elo : room.players[1].elo,
                        (room.players[0].is_white) ? room.players[1].elo : room.players[0].elo,
                        (winnerColor === "w") ? 1 : 0,
                    );

                    io.to(roomId).emit("winLossGameOver", {
                        winner: winnerColor,
                        by: "king captured", // could say "checkmate"
                        whiteEloChange,
                        blackEloChange,
                    });
                } else if (room.game.isGameOver()) {
                    // a "usual" game over, so no "null" references
                    if (room.game.isDraw?.()) {
                        const [whiteEloChange, blackEloChange] = eloRatingChange(
                            (room.players[0].is_white) ? room.players[0].elo : room.players[1].elo,
                            (room.players[0].is_white) ? room.players[1].elo : room.players[0].elo,
                            0.5
                        );

                        io.to(roomId).emit("drawGameOver", {
                            by: room.game.isDrawByFiftyMoves?.() && "50-move rule" ||
                                room.game.isThreefoldRepetition?.() && "threefold repetition" ||
                                room.game.isInsufficientMaterial?.() && "insufficient material" ||
                                room.game.isStalemate?.() && "stalemate" ||
                                null, // technically, should never be null
                            whiteEloChange,
                            blackEloChange,
                        });
                    } else {          // someone won, and someone lost
                        // in regular chess, whoever moves last for checkmate is winner
                        const winnerColor = isPlayerWhoJustMovedWhite ? "w" : "b";

                        const [whiteEloChange, blackEloChange] = eloRatingChange(
                            (room.players[0].is_white) ? room.players[0].elo : room.players[1].elo,
                            (room.players[0].is_white) ? room.players[1].elo : room.players[0].elo,
                            (winnerColor === "w") ? 1 : 0,
                        );

                        io.to(roomId).emit("winLossGameOver", {
                            winner: winnerColor,
                            by: "checkmate",
                            whiteEloChange,
                            blackEloChange,
                        });
                    }
                }
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
