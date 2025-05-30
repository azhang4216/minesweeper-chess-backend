const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const { SALT_ROUNDS } = process.env;

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    salted_password: {
        type: String,
        required: true,
    },
    date_joined: {
        type: Date,
        default: Date.now,
    },
    past_games: [{
        type: Schema.Types.ObjectId,
        ref: 'Game',
    }],
    friends: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
    friendRequestsSent: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    friendRequestsReceived: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    elo: {
        type: Number,
        default: 1500, // optional: default ELO rating
    },
    status: {
        type: String,
        enum: ['GOOD', 'BANNED', 'INACTIVE'],
        default: 'GOOD',
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
}, {
    toJSON: { virtuals: true },
    timestamps: true,
});

// Index on email (enforced by `unique: true`)
UserSchema.index({ email: 1 }, { unique: true });

/**
 * @description Mongoose hook for salting/hashing user password
 * @param {Function} next
 */
async function hashPassword(next) {
    const user = this;

    // only hash password if new/modified
    if (!user.isModified('salted_password')) return next();

    try {
        const salt = await bcrypt.genSalt(parseInt(SALT_ROUNDS, 10));
        const hash = await bcrypt.hash(user.salted_password, salt);

        user.salted_password = hash;
        return next();
    } catch (error) {
        console.log(error);
        return next(error);
    }
}

// pre-save/update schema for salting/hashing user password
UserSchema.pre('save', hashPassword);

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;