import express from "express";
const router = express.Router();
import { userController } from "../controllers/index.js";

// Helper to fetch usernames and IDs for a list of user IDs
async function fetchUsernamesAndIds(userIds) {
    return await Promise.all(
        userIds.map(async (id) => {
            const user = await userController.getUserById(id);
            return {
                id,
                username: user?.username,
            };
        })
    );
}

// Get profile info by username
router.post("/get-profile", async (req, res) => {
    const { username } = req.body;
    console.log(`Getting profile data for username ${username}`);
    try {
        const user = await userController.getUserByUsername(username);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Fetch usernames for friendRequestsReceived & friends
        const friendRequestsReceivedWithIdAndUsername = await fetchUsernamesAndIds(user.friendRequestsReceived);
        const friendsWithIdAndUsername = await fetchUsernamesAndIds(user.friends);

        res.json({
            _id: user._id,
            username: user.username,
            role: user.role,
            date_joined: user.date_joined,
            elo: user.elo,
            friends: friendsWithIdAndUsername,
            friendRequestsReceived: friendRequestsReceivedWithIdAndUsername,
            past_games: user.past_games,
            status: user.status,
        });
    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Send a friend request
router.post("/send-friend-request", async (req, res) => {
    const { requesteeUsername, requesterUsername } = req.body;

    if (!requesteeUsername || !requesterUsername) return res.status(400).json({ error: "Missing requesteeUsername/requesterUsername" });

    try {
        const user = await userController.getUserByUsername(requesterUsername);
        const friend = await userController.getUserByUsername(requesteeUsername);

        if (!user || !friend) return res.status(404).json({ error: "User not found" });

        // Friend request logic
        if (user.friends.includes(friend._id)) {
            return res.status(400).json({ error: "Already friends" });
        }
        if (user.friendRequestsSent.includes(friend._id)) {
            return res.status(400).json({ error: "Friend request already sent" });
        }
        if (user.friendRequestsReceived.includes(friend._id)) {
            user.friendRequestsReceived = user.friendRequestsReceived.filter(
                id => !id.equals(friend._id)
            );
            user.friends.push(friend._id);
            friend.friendRequestsSent = friend.friendRequestsSent.filter(
                id => !id.equals(user._id)
            );
            friend.friends.push(user._id);
        } else {
            user.friendRequestsSent.push(friend._id);
            friend.friendRequestsReceived.push(user._id);
        }

        await user.save();
        await friend.save();

        res.json({ message: "Friend request sent successfully" });
    } catch (err) {
        console.error("Error sending friend request:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Accept a friend request
router.post("/accept-friend-request", async (req, res) => {
    const { requesteeUsername, requesterUsername } = req.body;

    if (!requesteeUsername || !requesterUsername) return res.status(400).json({ error: "Missing requesteeUsername/requesterUsername" });

    try {
        const user = await userController.getUserByUsername(requesteeUsername);
        const friend = await userController.getUserByUsername(requesterUsername);

        if (!user || !friend) return res.status(404).json({ error: "User not found" });

        // Accept logic
        const receivedRequest = user.friendRequestsReceived.some(id => id.equals(friend._id));
        const sentRequest = friend.friendRequestsSent.some(id => id.equals(user._id));

        if (!receivedRequest || !sentRequest) {
            return res.status(400).json({ error: "No friend request to accept" });
        }

        user.friendRequestsReceived = user.friendRequestsReceived.filter(id => !id.equals(friend._id));
        friend.friendRequestsSent = friend.friendRequestsSent.filter(id => !id.equals(user._id));
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

// Reject a friend request
router.post("/reject-friend-request", async (req, res) => {
    const { requesteeUsername, requesterUsername } = req.body;

    if (!requesteeUsername || !requesterUsername) return res.status(400).json({ error: "Missing requesteeUsername/requesterUsername" });

    try {
        const user = await userController.getUserByUsername(requesteeUsername);
        const friend = await userController.getUserByUsername(requesterUsername);

        if (!user || !friend) return res.status(404).json({ error: "User not found" });

        // Reject logic
        user.friendRequestsReceived = user.friendRequestsReceived.filter(id => !id.equals(friend._id));
        friend.friendRequestsSent = friend.friendRequestsSent.filter(id => !id.equals(user._id));

        await user.save();
        await friend.save();

        res.json({ message: "Friend request rejected" });
    } catch (err) {
        console.error("Error rejecting friend request:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Remove a friend
router.post("/remove-friend", async (req, res) => {
    const { requesteeUsername, requesterUsername } = req.body;

    if (!requesteeUsername || !requesterUsername) return res.status(400).json({ error: "Missing requesteeUsername/requesterUsername" });

    try {
        const user = await userController.getUserByUsername(requesteeUsername);
        const friend = await userController.getUserByUsername(requesterUsername);

        if (!user || !friend) return res.status(404).json({ error: "User not found" });

        // Remove logic
        user.friends = user.friends.filter(id => !id.equals(friend._id));
        friend.friends = friend.friends.filter(id => !id.equals(user._id));

        await user.save();
        await friend.save();

        res.json({ message: "Friend removed" });
    } catch (err) {
        console.error("Error removing friend:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Delete account
// NOTE: this doesn't actually delete the user, just sets status to DELETED (for recovery)
router.post("/delete-account", async (req, res) => {
    const { requesterUsername } = req.body;

    try {
        const user = await userController.getUserByUsername(requesterUsername);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.status = 'DELETED';
        await user.save();

        res.json({ message: "Account deleted successfully" });
    } catch (err) {
        console.error("Error deleting account:", err);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;