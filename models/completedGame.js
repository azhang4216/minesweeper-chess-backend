const mongoose = require("mongoose");

// player subdocument schema
const playerSchema = new mongoose.Schema({
    id: { type: String, required: true },         // username if not guest, UUID if guest
    is_guest: { type: Boolean, required: true },
    original_elo: { type: Number, requried: true, default: 1500 },
    elo_change: { type: Number, required: true },
}, { _id: false });

const completedGameSchema = new mongoose.Schema({
    game_id: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    black_player: { type: [playerSchema], required: true },
    white_player: { type: [playerSchema], required: true },
    result: { type: String, enum: ['black won', 'white won', 'draw'], required: true },
    by: { type: String, required: true }, // e.g. abandonment, king exploded, checkmate
    game_pgn: { type: String, required: true },
    time_control: { type: Number, required: true }
});

module.exports = mongoose.model("CompletedGame", completedGameSchema);
