import bcrypt from 'bcrypt';
import jwt from 'jwt-simple'; // transmit info as a digitally signed string

import { Filter } from 'bad-words';
import { User } from '../models/index.js';
import { RESPONSE_CODES } from '../constants/index.js';

const filter = new Filter();
const JWT_SECRET = process.env.JWT_SECRET;

import crypto from 'crypto';
import nodemailer from 'nodemailer';

/**
 * @description creates a new user
 * @param {String} email
 * @param {String} username
 * @param {String} password
 * @returns {Promise<Object>} response with status or error
 */
export const registerUser = async (email, username, password) => {
    try {
        if (!email || !username || !password) {
            return RESPONSE_CODES.BAD_REQUEST;
        }

        // Check for profanity in username
        if (filter.isProfane(username)) {
            return {
                ...RESPONSE_CODES.VALIDATION_ERROR,
                message: 'Username contains inappropriate language.',
            };
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return {
                ...RESPONSE_CODES.BAD_REQUEST,
                message: 'User with this email already exists.',
            };
        }

        // Check if username already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return {
                ...RESPONSE_CODES.BAD_REQUEST,
                message: 'Username is already taken.',
            };
        }

        // Create and save new user
        const newUser = new User({
            email,
            username,
            salted_password: password, // password will be hashed via pre-save hook
            date_joined: new Date(),
        });

        await newUser.save();

        return {
            ...RESPONSE_CODES.SUCCESS,
            userId: newUser._id,
        };
    } catch (error) {
        console.log('Error in registerUser:', error);
        return RESPONSE_CODES.INTERNAL_ERROR;
    }
};

/**
 * @description logs in a user
 * @param {String} email
 * @param {String} password
 * @returns {Promise<Object>} token or error
 */
export const loginUser = async (email, password) => {
    try {
        const user = await User.findOne({ email });
        if (!user) return RESPONSE_CODES.NOT_FOUND;

        const match = await bcrypt.compare(password, user.salted_password);
        if (!match) return RESPONSE_CODES.UNAUTHORIZED;

        const payload = { id: user._id, email: user.email };
        const token = jwt.encode(payload, JWT_SECRET);

        return { ...RESPONSE_CODES.SUCCESS, token };
    } catch (error) {
        console.log(error);
        return RESPONSE_CODES.SERVER_ERROR;
    }
};

/**
 * @description retrieves user object
 * @param {String} email email address of user
 * @returns {Promise<User>} promise that resolves to user object or error
 */
export const getUserByEmail = async (email) => {
    try {
        const user = await User.findOne({ email });

        if (user) return user;
        return RESPONSE_CODES.NOT_FOUND;
    } catch (error) {
        console.log(error);
        return error;
    }
};

/**
 * @description retrieves user object
 * @param {String} id user id
 * @returns {Promise<User>} promise that resolves to user object or error
 */
export const getUserById = async (id) => {
    try {
        const user = await User.findOne({ _id: id });
        if (user) {
            return {
                ...RESPONSE_CODES.SUCCESS,
                user,
            };
        }
        return RESPONSE_CODES.NOT_FOUND;
    } catch (error) {
        console.log(error);
        return RESPONSE_CODES.NOT_FOUND;
    }
};

/**
 * @description retrieves user object
 * @param {String} username 
 * @returns {Promise<User>} promise that resolves to user object or error
 */
export const getUserByUsername = async (username) => {
    try {
        const user = await User.findOne({ username });
        return user || null;
    } catch (error) {
        console.log(error);
        return null;
    }
};

/**
 * @description deletes user with given id
 * @param {String} id user id
 * @returns {Promise<User>} promise that resolves to success object or error
 */
export const deleteUser = async (id) => {
    try {
        await User.deleteOne({ _id: id });
        return RESPONSE_CODES.SUCCESS;
    } catch (error) {
        console.log(error);
        return error;
    }
};

/**
 * @description deletes user with username
 * @param {String} username
 * @returns {Promise<User>} promise that resolves to success object or error
 */
export const deleteUserByUsername = async (username) => {
    try {
        await User.deleteOne({ username });
        return RESPONSE_CODES.SUCCESS;
    } catch (error) {
        console.log(error);
        return error;
    }
};

/**
 * @description adds a game ID to the user's past_games list
 * @param {String} username
 * @param {String} gameId
 * @returns {Promise<Object>}
 */
export const addPastGame = async (username, gameId) => {
    try {
        const user = await getUserByUsername(username);
        if (!user) return RESPONSE_CODES.NOT_FOUND;

        if (!user.past_games.includes(gameId)) {
            user.past_games.push(gameId);
            await user.save();
        }

        return RESPONSE_CODES.SUCCESS;
    } catch (error) {
        console.log(error);
        return RESPONSE_CODES.SERVER_ERROR;
    }
};

/**
 * @description updates user's ELO rating
 * @param {String} username
 * @param {Number} eloChange
 * @returns {Promise<Object>}
 */
export const updateUserElo = async (username, eloChange) => {
    try {
        const user = await getUserByUsername(username);
        if (!user) return RESPONSE_CODES.NOT_FOUND;

        user.elo += eloChange;
        await user.save();

        return {
            ...RESPONSE_CODES.SUCCESS,
            message: `ELO updated by ${eloChange}. New ELO: ${user.elo}`,
            user,
        };
    } catch (error) {
        console.log(error);
        return RESPONSE_CODES.SERVER_ERROR;
    }
};

/**
 * @description adds requestee to requester's friendRequestsSent &
 * adds requester to requestee's friendRequestsReceived
 * @param {String} fromUserId requestee id
 * @param {String} toUserId requester id
 * @returns {Promise<Object>}
 */
export const sendFriendRequest = async (fromUserId, toUserId) => {
    try {
        if (fromUserId === toUserId) {
            return {
                ...RESPONSE_CODES.BAD_REQUEST,
                message: "You cannot send a friend request to yourself.",
            };
        }

        const [fromUser, toUser] = await Promise.all([
            User.findById(fromUserId),
            User.findById(toUserId),
        ]);

        if (!fromUser || !toUser) return RESPONSE_CODES.NOT_FOUND;

        // Check if already friends
        if (fromUser.friends.includes(toUserId)) {
            return {
                ...RESPONSE_CODES.BAD_REQUEST,
                message: "You are already friends.",
            };
        }

        // Check if request already sent
        if (fromUser.friendRequestsSent.includes(toUserId)) {
            return {
                ...RESPONSE_CODES.BAD_REQUEST,
                message: "Friend request already sent.",
            };
        }

        // Check if there's a pending request in the opposite direction (auto accept?)
        if (fromUser.friendRequestsReceived.includes(toUserId)) {
            // Auto accepts the friend request if reverse request exists
            return acceptFriendRequest(fromUserId, toUserId);
        }

        fromUser.friendRequestsSent.push(toUserId);
        toUser.friendRequestsReceived.push(fromUserId);

        await Promise.all([fromUser.save(), toUser.save()]);

        return {
            ...RESPONSE_CODES.SUCCESS,
            message: "Friend request sent.",
        };
    } catch (error) {
        console.log(error);
        return RESPONSE_CODES.INTERNAL_ERROR;
    }
};

/**
 * @description requestee accepts requester's friend request &
 * they are added as each others' friends
 * @param {String} userId user (requestee) id
 * @param {String} requesterId requester id
 * @returns {Promise<User>} promise that resolves to success object or error
 */
export const acceptFriendRequest = async (userId, requesterId) => {
    try {
        const [user, requester] = await Promise.all([
            User.findById(userId),
            User.findById(requesterId),
        ]);

        if (!user || !requester) return RESPONSE_CODES.NOT_FOUND;

        // Check if there's a valid incoming request
        if (!user.friendRequestsReceived.includes(requesterId)) {
            return {
                ...RESPONSE_CODES.BAD_REQUEST,
                message: "No friend request from this user.",
            };
        }

        // Remove requests
        user.friendRequestsReceived = user.friendRequestsReceived.filter(
            (id) => id.toString() !== requesterId.toString()
        );
        requester.friendRequestsSent = requester.friendRequestsSent.filter(
            (id) => id.toString() !== userId.toString()
        );

        // Add each other as friends if not already
        if (!user.friends.includes(requesterId)) user.friends.push(requesterId);
        if (!requester.friends.includes(userId)) requester.friends.push(userId);

        await Promise.all([user.save(), requester.save()]);

        return {
            ...RESPONSE_CODES.SUCCESS,
            message: "Friend request accepted.",
            user,
            requester,
        };
    } catch (error) {
        console.log(error);
        return RESPONSE_CODES.INTERNAL_ERROR;
    }
};

/**
 * @description reject the incoming request
 * @param {String} fromUserId
 * @param {String} toUserId
 * @returns {Promise<User>} promise that resolves to success object or error
 */
export const rejectFriendRequest = async (fromUserId, toUserId) => {
    try {
        const [fromUser, toUser] = await Promise.all([
            User.findById(fromUserId),
            User.findById(toUserId),
        ]);

        if (!fromUser || !toUser) return RESPONSE_CODES.NOT_FOUND;

        fromUser.friendRequestsSent = fromUser.friendRequestsSent.filter(
            (id) => id.toString() !== toUserId.toString()
        );

        toUser.friendRequestsReceived = toUser.friendRequestsReceived.filter(
            (id) => id.toString() !== fromUserId.toString()
        );

        await Promise.all([fromUser.save(), toUser.save()]);

        return {
            ...RESPONSE_CODES.SUCCESS,
            message: "Friend request rejected.",
        };
    } catch (error) {
        console.log(error);
        return RESPONSE_CODES.INTERNAL_ERROR;
    }
};

/**
 * @description mutually removes two friends as each other's friends
 * @param {String} userId user id
 * @param {String} friendId friend id
 * @returns {Promise<User>} promise that resolves to success object or error
 */
export const removeFriend = async (userId, friendId) => {
    try {
        const user = await User.findById(userId);
        const friend = await User.findById(friendId);

        if (!user || !friend) {
            return RESPONSE_CODES.NOT_FOUND;
        }

        let changed = false;

        // Remove friendId from user's friends list if present
        const userIndex = user.friends.indexOf(friendId);
        if (userIndex !== -1) {
            user.friends.splice(userIndex, 1);
            changed = true;
        }

        // Remove userId from friend's friends list if present
        const friendIndex = friend.friends.indexOf(userId);
        if (friendIndex !== -1) {
            friend.friends.splice(friendIndex, 1);
            changed = true;
        }

        if (!changed) {
            return {
                ...RESPONSE_CODES.BAD_REQUEST,
                message: 'Users are not friends.',
            };
        }

        // Save both users
        await Promise.all([user.save(), friend.save()]);

        return {
            ...RESPONSE_CODES.SUCCESS,
            message: 'Friendship removed mutually.',
            user,
            friend,
        };
    } catch (error) {
        console.log(error);
        return RESPONSE_CODES.INTERNAL_ERROR;
    }
};

/**
 * @description Adds a friend to a user if not already added
 * @param {String} userId - ID of the user
 * @param {String} friendId - ID of the friend to add
 * @returns {Object} Response object with status and message
 */
export const addFriend = async (userId, friendId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            return RESPONSE_CODES.NOT_FOUND;
        }

        if (user.friends.includes(friendId)) {
            return {
                ...RESPONSE_CODES.BAD_REQUEST,
                message: 'User is already your friend.',
            };
        }

        user.friends.push(friendId);
        await user.save();

        return {
            ...RESPONSE_CODES.SUCCESS,
            message: 'Friend added successfully.',
            user,
        };
    } catch (error) {
        console.log(error);
        return RESPONSE_CODES.INTERNAL_ERROR;
    }
};

/**
 * @description changes user status if the requester is an admin
 * @param {String} requesterId id of the user making the request
 * @param {String} userId id of the user whose status is to be changed
 * @param {String} newStatus new status string
 * @returns {Promise<Object>} response object with status and message
 */
export const changeUserStatus = async (requesterId, userId, newStatus) => {
    try {
        const requester = await User.findById(requesterId);
        if (!requester) return RESPONSE_CODES.UNAUTHORIZED;

        if (requester.role !== 'admin') {
            return {
                ...RESPONSE_CODES.FORBIDDEN,
                message: 'Only admins can change user status.',
            };
        }

        const user = await User.findById(userId);
        if (!user) return RESPONSE_CODES.NOT_FOUND;

        user.status = newStatus;
        await user.save();

        return {
            ...RESPONSE_CODES.SUCCESS,
            message: `User status updated to ${newStatus}.`,
            user,
        };
    } catch (error) {
        console.log(error);
        return RESPONSE_CODES.INTERNAL_ERROR;
    }
};

/**
 * @description initiates password reset: generates token and emails user
 * @param {String} email email of user requesting reset
 * @returns {Promise<Object>} response with status and message
 */
export const initiatePasswordReset = async (email) => {
    try {
        const user = await User.findOne({ email });
        if (!user) return RESPONSE_CODES.NOT_FOUND;

        // Generate a secure random token
        const token = crypto.randomBytes(20).toString('hex');

        // Set token and expiration (e.g., 1 hour from now)
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await user.save();

        // Configure your email transporter (e.g. SMTP)
        const transporter = nodemailer.createTransport({
            // Use your SMTP/email provider details here
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Compose the reset email
        const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_USER,
            subject: 'Password Reset Request',
            text: `You requested a password reset. Click the link below to reset your password:\n\n${resetURL}\n\nIf you did not request this, please ignore this email.`,
        };

        await transporter.sendMail(mailOptions);

        return {
            ...RESPONSE_CODES.SUCCESS,
            message: 'Password reset email sent.',
        };
    } catch (error) {
        console.log(error);
        return RESPONSE_CODES.INTERNAL_ERROR;
    }
};

/**
 * @description handles password reset from frontend reset form
 * @route POST /api/users/reset-password
 */
export const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const decoded = jwt.decode(token, JWT_SECRET);
        const email = decoded.sub;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json(RESPONSE_CODES.NOT_FOUND);
        }

        const salt = await bcrypt.genSalt(10);
        user.salted_password = await bcrypt.hash(newPassword, salt);
        await user.save();

        return res.status(200).json(RESPONSE_CODES.SUCCESS);
    } catch (error) {
        console.error(error);
        return res.status(400).json({
            ...RESPONSE_CODES.BAD_REQUEST,
            message: "Invalid or expired reset token.",
        });
    }
};

// THE FOLLOWING FUNCTIONS ARE NOT YET USED
/**
 * @description salts and hashes provided password and compares with salted_password for user in database
 * @param {Object} credentials credentials object with email and password field
 * @returns {Promise<Object>} promise that resolves to object with result field of authenticated and user if authed
 */
export const isAuthedUser = async (credentials) => {
    const user = await getUserByEmail(credentials.email);
    if (!user || user === RESPONSE_CODES.NOT_FOUND) throw new Error(RESPONSE_CODES.NOT_FOUND.type);

    if (user.salted_password) {
        try {
            const result = await bcrypt.compare(credentials.password, user.salted_password);

            // explicit check to only evaluate boolean
            // (will false a null/undefined instead of returning null/undefined)
            return {
                result: result === true,
                ...result === true ? { user } : {},
            };
        } catch (error) {
            console.log(error);

            if (error.type) throw new Error(error);
            throw new Error({
                ...RESPONSE_CODES.INTERNAL_ERROR,
                error,
            });
        }
    } else {
        throw new Error(RESPONSE_CODES.INTERNAL_ERROR.type);
    }
};

/**
 * @description generates auth token for given user
 * @param {String} email email address of user
 */
export const tokenForUser = (email) => {
    const timestamp = new Date().getTime();
    return jwt.encode({ sub: email, iat: timestamp }, process.env.AUTH_SECRET);
};

export const getUserByJWT = async (authorization) => {
    const JWTtoken = authorization.split(' ')[1];
    const decoded = jwt.decode(JWTtoken, process.env.AUTH_SECRET);
    const user = await getUserByEmail(decoded.sub);

    return user;
};

export const userWithEmailExists = async (email) => {
    try {
        const user = await getUserByEmail(email);
        return user !== RESPONSE_CODES.NOT_FOUND;
    } catch (error) {
        console.log(error);
        throw error;
    }
};

export const getUserElo = async (username) => {
    try {
        const user = await getUserByUsername(username);
        if (!user) return null;
        return user.elo;
    } catch (error) {
        console.log(error);
        throw error;
    }
};