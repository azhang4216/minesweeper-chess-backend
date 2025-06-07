const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Chess } = require('chess.js');
const { ActiveGame } = require('./models');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI, { dbName: 'landmine_chess' })
    .then(() => runGame())
    .catch((err) => console.error('MongoDB connection error:', err));

async function runGame() {
    console.log('Connected to MongoDB');

    // 1. Create two players
    const whitePlayer = {
        id: uuidv4(),
        is_guest: true,
        is_white: true,
        bombs: [],
        elo: 1200,
        seconds_left: 300,
        timer: {
            startTime: null,
            duration: 30,
        }
    };

    const blackPlayer = {
        id: uuidv4(),
        is_guest: true,
        is_white: false,
        bombs: [],
        elo: 1200,
        seconds_left: 300,
        timer: {
            startTime: null,
            duration: 30,
        }
    };

    // 2. Create ActiveGame document
    const roomId = `room-${Date.now()}-${whitePlayer.id}-${blackPlayer.id}`;
    const game = new ActiveGame({
        room_id: roomId,
        players: [whitePlayer, blackPlayer],
        game_pgn: '',
        game_state: 'PLAYING',
        time_control: 300
    });

    await game.save();
    console.log(`Game created with room_id: ${roomId}`);

    // 3. Run a random move loop with chess.js
    let chess = new Chess();

    while (!chess.isGameOver()) {
        // 1. Find the game document by room_id
        const gameDoc = await ActiveGame.findOne({ room_id: roomId });

        // 2. Load the PGN into a new chess object
        if (gameDoc) {
            chess.loadPgn(gameDoc.game_pgn);
        } else {
            console.log("error loading pgn!");
            return;
        }

        // 3. Make a random legal move
        const moves = chess.moves();
        const move = moves[Math.floor(Math.random() * moves.length)];
        chess.move(move);

        // 4. Update the PGN in the database
        const updatedPGN = chess.pgn();

        await ActiveGame.findOneAndUpdate(
            { room_id: roomId },
            { game_pgn: updatedPGN }
        );

        console.log(chess.ascii());
    }

    console.log("Final PGN:", chess.pgn());

    mongoose.connection.close();
}
