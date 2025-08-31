// NOTE: we don't use this.

import mongoose from "mongoose";

const activePlayersSchema = new mongoose.Schema({
    playerId: { type: String, required: true },     // username if not guest, UUID if guest
    isGuest: { type: Boolean, required: true },
    roomId: { type: String, required: false },
    isPlaying: { type: Boolean, required: true }    // true if currently in a game, prevents joining multiple games
});

export default mongoose.model("ActivePlayer", activePlayersSchema);
