import express from "express";
const router = express.Router();
import { User } from "../models/index.js";
import { userController } from "../controllers/index.js";

// Get all matching profiles by username
router.post("/", async (req, res) => {
    const { inputStr } = req.body;

    if (!inputStr || typeof inputStr !== "string") {
        return res.status(400).json({ error: "Invalid or missing inputStr" });
    }

    try {
        // Find users whose usernames start with the input string (case-insensitive)
        const users = await User.find({
            username: { $regex: `^${inputStr}`, $options: "i" }
        }).select("username _id elo"); // return only necessary fields

        res.json({ users });
    } catch (err) {
        console.error("Error fetching user profiles:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Get profile info by user ID
router.get("/:userId", async (req, res) => {
    const { userId } = req.params;
    console.log(`Getting profile data for user ID: ${userId}`);

    if (!userId) {
        return res.status(400).json({ error: "Invalid user ID" });
    }

    try {
        return await userController.getUserById(userId);
    } catch (error) {
        console.log("Error getting user by user ID", error);
        return res.status(500).json({ error: "Server error" });
    }
});

export default router;
