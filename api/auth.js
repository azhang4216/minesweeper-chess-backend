const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcryptjs");

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
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ error: "Username and password are required" });

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });

        res.json({ message: "Login successful", token, user: { id: user._id, username: user.username } });
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

module.exports = router;
