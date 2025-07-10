import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
    player_id: { type: String, required: true }, // username or UUID (if guest)
    elo_before_game_start: { type: Number, required: true },
    elo_change: { type: Number, required: true },
    is_guest: { type: Boolean, required: true }
}, { _id: false });                              // prevent Mongoose from creating an _id for the subdocument

const recordedGameSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    white_player: { type: playerSchema, required: true },
    black_player: { type: playerSchema, required: true },
    result: { type: String, enum: ['WHITE_WINS', 'BLACK_WINS', 'DRAW'], required: true },
    result_by: { type: String, required: true },
    bombs: { type: [String], required: true },
    game_pgn: { type: String, required: true },
    time_control: { type: String, required: true }
});

export default mongoose.model("RecordedGame", recordedGameSchema);