const express = require("express");
const router = express.Router();
const { User, Game } = require("../models");

// Get profile info by userId
router.get("/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findById(userId)
            .populate("friends", "username")
            .populate("past_games"); // You can populate more if needed

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            username: user.username,
            email: user.email,
            role: user.role,
            date_joined: user.date_joined,
            elo: user.elo,
            friends: user.friends,
            past_games: user.past_games,
        });
    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Add a friend
router.post("/:userId/add-friend", async (req, res) => {
    const { userId } = req.params;
    const { friendId } = req.body;

    if (userId === friendId) return res.status(400).json({ error: "Cannot add yourself" });

    try {
        const user = await User.findById(userId);
        const friend = await User.findById(friendId);

        if (!user || !friend) return res.status(404).json({ error: "User not found" });

        // Check if already friends
        if (user.friends.includes(friendId)) {
            return res.status(400).json({ error: "Already friends" });
        }

        user.friends.push(friendId);
        friend.friends.push(userId);

        await user.save();
        await friend.save();

        res.json({ message: "Friend added successfully" });
    } catch (err) {
        console.error("Error adding friend:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Delete account
router.delete("/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findByIdAndDelete(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ message: "Account deleted successfully" });
    } catch (err) {
        console.error("Error deleting account:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
