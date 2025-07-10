import express from "express";
const router = express.Router();
import {
    ActivePlayer,
    User
} from "../models/index.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import Filter from 'bad-words';

const filter = new Filter();
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

    // Username validation
    if (username.length < 3 || username.length > 20)
        return res.status(400).json({ error: "Username must be between 3 and 20 characters" });

    if (username.includes(' ') || username.includes('/'))
        return res.status(400).json({ error: "Username cannot contain spaces or '/'" });

    if (filter.isProfane(username)) {
        return res.status(400).json({ error: "Username contains inappropriate language" });
    }

    try {
        const existingUsername = await User.findOne({ username });
        if (existingUsername) return res.status(400).json({ error: "Username already taken" });

        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ error: "An account with this email already exists" });

        const emailVerificationToken = crypto.randomBytes(32).toString("hex");
        const emailVerificationExpires = Date.now() + 1000 * 60 * 60; // 1 hour expiry

        const newUser = new User({
            email,
            username,
            salted_password: password,
            emailVerificationToken,
            emailVerificationExpires
        });

        await newUser.save();

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`;

        await transporter.sendMail({
            from: `"Landmine Chess App" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify your email",
            html: `
                <div style="font-family: Impact, Charcoal, sans-serif; background-color: #fdfdfd; padding: 20px; text-align: center;">
                <img src="cid:landmineLogo" alt="Landmine Chess" style="width: 100%; max-width: 350px; height: auto; margin-bottom: 20px;" />
                <h1 style="font-size: 30px; color: #333;">Verify Your Email</h1>
                <p style="font-size: 18px; color: #555;">
                    Click the link below to verify your email. This link will expire in an hour.
                </p>
                <a href="${verifyUrl}" 
                    style="
                        display: inline-block;
                        background-color: #6b4caf;
                        color: #ffffff;
                        text-decoration: none;
                        font-size: 18px;
                        padding: 12px 24px;
                        margin-top: 20px;
                        border-radius: 6px;
                        font-weight: bold;
                    ">
                    Verify Email
                </a>
                </div>
            `,
            attachments: [{
                filename: 'landmine_purple.png',
                path: './constants/landmine_purple.png',
                cid: 'landmineLogo'
            }]
        });

        return res.status(201).json({
            message: "Account created. Please check your email to verify your address."
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});

router.post('/verify-email', async (req, res) => {
    const { token } = req.body;

    if (!token) return res.status(400).json({ error: "Missing token" });

    try {
        const user = await User.findOne({
            emailVerificationToken: token,
            // emailVerificationExpires: { $gt: Date.now() } 
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid token" });
        } else if (user.emailVerificationExpires < Date.now()) {
            // TODO: send another verification link?
            return res.status(400).json({ error: "Link has already expired." });
        } else if (user.isEmailVerified) {
            return res.status(400).json({ error: "Email is already verified." });
        }

        user.isEmailVerified = true;

        // we leave the email verification stuff in the account for seeing if email is already verified
        // user.emailVerificationToken = undefined;
        // user.emailVerificationExpires = undefined;

        await user.save();
        console.log("user successfully verified");
        return res.status(200).json({ message: "User successfully verified." });
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

        if (!user.isEmailVerified) {
            return res.status(403).json({ error: "Please verify your email before logging in." });
        }

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

export default router;
