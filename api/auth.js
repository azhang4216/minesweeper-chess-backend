import express from "express";
const router = express.Router();
import {
    // ActivePlayer,
    User
} from "../models/index.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Filter } from 'bad-words';

const filter = new Filter();
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION

// ------------------------
// HELPER FUNCTIONS
// ------------------------

// Send verification email + returns boolean indicating success
const sendVerificationEmail = async (emailVerificationToken, email) => {
    try {
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

        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

// Generate new token and expiry
const generateNewTokenAndExpiry = () => {
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = Date.now() + 1000 * 60 * 60; // 1 hour
    return { emailVerificationToken, emailVerificationExpires };
}

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

    if (!email || !username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    // Username validation
    if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: "Username must be between 3 and 20 characters" });
    }

    if (/[\s\W]/.test(username)) {
        setMessage('Username cannot contain any whitespace or special characters.');
        return;
    }

    if (filter.isProfane(username)) {
        return res.status(400).json({ error: "Username contains inappropriate language" });
    }

    try {
        const existingUsername = await User.findOne({ username });
        if (existingUsername) return res.status(400).json({ error: "Username already taken" });

        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ error: "An account with this email already exists" });

        const { emailVerificationToken, emailVerificationExpires } = generateNewTokenAndExpiry();

        const newUser = new User({
            email,
            username,
            salted_password: password,
            emailVerificationToken,
            emailVerificationExpires
        });

        await newUser.save();

        const successfullySentVerificationEmail = sendVerificationEmail(emailVerificationToken, email);

        if (!successfullySentVerificationEmail) {
            return res.status(500).json({ error: "Failed to send verification email. Please try again later." });
        }

        return res.status(201).json({
            message: "Account created. Please check your email to verify your address."
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});

// ------------------------
// VERIFY EMAIL
// ------------------------
router.post('/verify-email', async (req, res) => {
    const { token } = req.body;

    if (!token) return res.status(400).json({ error: "Missing token" });

    try {
        const user = await User.findOne({ emailVerificationToken: token });

        if (!user) {
            return res.status(400).json({ error: "Invalid token" });
        } else if (user.emailVerificationExpires < Date.now()) {
            return res.status(400).json({ error: "Link has already expired." });
        } else if (user.isEmailVerified) {
            return res.status(400).json({ error: "Email is already verified." });
        }

        user.isEmailVerified = true;
        await user.save();
        return res.status(200).json({ message: "User successfully verified." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});

// ------------------------
// RESEND VERIFICATION EMAIL
// ------------------------
router.post('/resend-verification', async (req, res) => {
    const { identifier } = req.body; // can be email or username
    if (!identifier) return res.status(400).json({ error: "Missing email or username" });

    try {
        // Determine if it's an email or username
        const isEmail = identifier.includes('@');
        const query = isEmail ? { email: identifier } : { username: identifier };

        const user = await User.findOne(query);
        if (!user) return res.status(404).json({ error: `No such account with the ${isEmail ? "email" : "username"} of ${identifier} exists.` });
        if (user.status === 'BANNED') return res.status(403).json({ error: "This account has been banned." });
        if (user.isEmailVerified) return res.status(400).json({ error: "The account is already verified." });

        const { emailVerificationToken, emailVerificationExpires } = generateNewTokenAndExpiry();
        user.emailVerificationToken = emailVerificationToken;
        user.emailVerificationExpires = emailVerificationExpires;
        await user.save();

        const successfullySentVerificationEmail = sendVerificationEmail(emailVerificationToken, user.email);

        if (!successfullySentVerificationEmail) {
            return res.status(500).json({ error: "Failed to send verification email. Please try again later." });
        }

        return res.status(201).json({ message: "Verification email resent. Check your inbox." });
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

        if (user.status === 'BANNED') {
            return res.status(403).json({ error: "Your account has been banned." });
        }

        if (user.status === 'DELETED') {
            return res.status(403).json({ error: "Your account has been deleted." });
        }

        const isMatch = await bcrypt.compare(password, user.salted_password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
        console.log(`Generated token on login: ${token}`);
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
// VERIFY TOKEN
// ------------------------
router.get('/verify-token', async (req, res) => {
    const authHeader = req.headers.authorization;
    console.log(`auth header: ${authHeader}`);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        console.log(`Verifying token: ${token}`);
        console.log(`JWT secret: ${JWT_SECRET}`);
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(`Decoded token: ${JSON.stringify(decoded)}`);
        const user = await User.findById(decoded.userId).select('email username _id');
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ user: { id: user._id, username: user.username, email: user.email } });
    } catch (err) {
        console.error('JWT Error:', err);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

router.get('/guest-uuid', async (_req, res) => {
    try {
        // TODO: remove this
        // let guestUUID;
        // let result;

        // // Keep generating until we find a unique UUID (i.e., one not already in ActivePlayer)
        // do {
        //     guestUUID = uuidv4();
        //     result = await ActivePlayer.findOne({ playerId: guestUUID });
        // } while (result);

        // console.log(`Generated guest UUID: ${guestUUID}`);

        // // Create a new ActivePlayer with the unique UUID
        // const newGuest = new ActivePlayer({
        //     playerId: guestUUID,
        //     isGuest: true
        // });

        // await newGuest.save();
        // console.log(`Saved new guest ${guestUUID} to ActivePlayers`);

        // edge case: if too many active players, two player could theoretically get same UUID
        // but realistically, the chance of a UUID collision is extremely low
        res.json({ guestUUID: uuidv4() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server failed to generate guest UUID' });
    }
});

export default router;
