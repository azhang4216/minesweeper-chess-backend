import express from "express";
const router = express.Router();
import { userController } from "../controllers/index.js";

// Get profile info by username
router.get("/:username", async (req, res) => {
    const { username } = req.params;
    console.log(`Getting profile data for ${username}`);
    try {
        const user = await userController.getUserByUsername(username);
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            username: user.username,
            role: user.role,
            date_joined: user.date_joined,
            elo: user.elo,
            friends: user.friends,
            friendRequestsReceived: user.friendRequestsReceived,
            past_games: user.past_games,
        });
    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Add a friend
router.post("/:username/add-friend", async (req, res) => {
    const { username } = req.params;
    const { friendUsername } = req.body;

    if (username === friendUsername) return res.status(400).json({ error: "Cannot add yourself" });

    try {
        const user = await userController.getUserByUsername(username);
        const friend = await userController.getUserByUsername(friendUsername);

        if (!user || !friend) return res.status(404).json({ error: "User not found" });

        // Check if already friends
        if (user.friends.includes(friend._id)) {
            return res.status(400).json({ error: "Already friends" });
        }

        // Check if friend request already sent
        if (user.friendRequestsSent.includes(friend._id)) {
            return res.status(400).json({ error: "Friend request already sent" });
        }

        // If friend request already received, accept it
        if (user.friendRequestsReceived.includes(friend._id)) {
            // Remove friend from user.friendRequestsReceived
            user.friendRequestsReceived = user.friendRequestsReceived.filter(
                id => !id.equals(friend._id)
            );

            // Add friend to user.friends
            user.friends.push(friend._id);

            // Remove user from friend.friendRequestsSent
            friend.friendRequestsSent = friend.friendRequestsSent.filter(
                id => !id.equals(user._id)
            );

            // Add user to friend.friends
            friend.friends.push(user._id);
        } else {
            // If no existing request, send a new friend request
            user.friendRequestsSent.push(friend._id);
            friend.friendRequestsReceived.push(user._id);
        }

        await user.save();
        await friend.save();

        res.json({ message: "Friend added successfully" });
    } catch (err) {
        console.error("Error adding friend:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Accept a friend request
router.post("/:username/accept-friend", async (req, res) => {
    const { username } = req.params;
    const { friendUsername } = req.body;

    if (username === friendUsername) {
        return res.status(400).json({ error: "Cannot accept yourself" });
    }

    try {
        const user = await userController.getUserByUsername(username);
        const friend = await userController.getUserByUsername(friendUsername);

        if (!user || !friend) {
            return res.status(404).json({ error: "User not found" });
        }

        // Ensure there is a pending friend request
        const receivedRequest = user.friendRequestsReceived.some(id => id.equals(friend._id));
        const sentRequest = friend.friendRequestsSent.some(id => id.equals(user._id));

        if (!receivedRequest || !sentRequest) {
            return res.status(400).json({ error: "No friend request to accept" });
        }

        // Remove friend request
        user.friendRequestsReceived = user.friendRequestsReceived.filter(id => !id.equals(friend._id));
        friend.friendRequestsSent = friend.friendRequestsSent.filter(id => !id.equals(user._id));

        // Add to friends
        user.friends.push(friend._id);
        friend.friends.push(user._id);

        await user.save();
        await friend.save();

        res.json({ message: "Friend request accepted" });
    } catch (err) {
        console.error("Error accepting friend request:", err);
        res.status(500).json({ error: "Server error" });
    }
});


// Delete account
router.delete("/:username", async (req, res) => {
    const { username } = req.params;

    try {
        const user = await userController.deleteUserByUsername(username);
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ message: "Account deleted successfully" });
    } catch (err) {
        console.error("Error deleting account:", err);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
