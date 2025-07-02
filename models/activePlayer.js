import mongoose from "mongoose";

const activePlayersSchema = new mongoose.Schema({
    playerId: { type: String, required: true }, // username if not guest, UUID if guest
    isGuest: { type: Boolean, required: true },
    roomId: { type: String, required: false }
});

export default mongoose.model("ActivePlayer", activePlayersSchema);
