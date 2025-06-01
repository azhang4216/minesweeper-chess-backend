const express = require("express");
const router = express.Router();
const { 
    ActivePlayer,
    User
} = require("../models");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION

// ------------------------
// RESET PASSWORD 
// ------------------------
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

// ------------------------
// CREATE ACCOUNT
// ------------------------
router.post("/create-account", async (req, res) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password)
        return res.status(400).json({ error: "Username and password are required" });

    try {
        const existingUsername = await User.findOne({ username });
        if (existingUsername) return res.status(400).json({ error: "Username already taken" });

        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ error: "An account with this email already exists"});

        // note: pre-save hook will salt our password for us
        const newUser = new User({ 
            email, 
            username, 
            salted_password: password 
        });
        await newUser.save();

        console.log(`User successfully created: ${username}`)

        return res.status(201).json({ 
            message: "Account created successfully",
            username
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});

// ------------------------
// LOGIN
// ------------------------
router.post("/login", async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ error: "Username/email and password are required" });
    }

    try {
        // Determine if it's an email or username
        const isEmail = identifier.includes('@');
        const query = isEmail ? { email: identifier } : { username: identifier };

        const user = await User.findOne(query);
        if (!user) return res.status(400).json({ error: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.salted_password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });

        res.json({
            message: "Login successful",
            token,
            user: { id: user._id, username: user.username, email: user.email },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ------------------------
// VERIFY
// ------------------------
router.get('/verify', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ message: 'No token' });

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('email username');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ user });
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

router.get('/guest-uuid', async (_req, res) => {
    try {
        let guestUUID;
        let result;

        // Keep generating until we find a unique UUID (i.e., one not already in ActivePlayer)
        do {
            guestUUID = uuidv4();
            result = await ActivePlayer.findOne({ playerId: guestUUID });
        } while (result);

        console.log(`Generated guest UUID: ${guestUUID}`);

        // Create a new ActivePlayer with the unique UUID
        const newGuest = new ActivePlayer({
            playerId: guestUUID,
            isGuest: true
        });

        await newGuest.save();
        console.log(`Saved new guest ${guestUUID} to ActivePlayers`);

        res.json({ guestUUID });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server failed to generate guest UUID' });
    }
});

module.exports = router;
