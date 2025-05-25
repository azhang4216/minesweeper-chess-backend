const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcryptjs");

// reset-password endpoint
router.post("/reset-password", async (req, res) => {
    console.log("reset password call received!");
    const { token, password } = req.body;

    try {
        const user = await User.findOne({ resetToken: token });
        if (!user) return res.status(400).json({ error: "Invalid token" });

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.resetToken = null; // clear token
        await user.save();

        res.json({ message: "Password successfully reset!" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
