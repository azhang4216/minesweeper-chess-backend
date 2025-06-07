const mongoose = require("mongoose");

// player subdocument schema
const playerSchema = new mongoose.Schema({
    id: { type: String, required: true },         // username if not guest, UUID if guest
    is_guest: { type: Boolean, required: true },
    is_white: { type: Boolean, required: true },
    bombs: { type: [String], required: true, default: [] },
    elo: { type: Number, required: true },
    
    // timer logic
    seconds_left: { type: Number },    // updated at end of move
    timer: {
        startTime: { type: Date },     // when this player's turn started
        duration: { type: Number }     // how many seconds they have this turn
    }}, { _id: false });

// Define the active game schema
const activeGameSchema = new mongoose.Schema({
    game_id: { type: String, required: true, unique: true },
    players: { type: [playerSchema], required: true },

    // note: we need pgn not just fen, to check for repetition draws, etc.
    game_pgn: { type: String, default: '' },
    game_state: { 
        type: String, 
        enum: ["MATCHING", "PLACING_BOMBS", "PLAYING"], 
        required: true 
    },
    time_control: { type: Number, required: true }
});

module.exports = mongoose.model("ActiveGame", activeGameSchema);
