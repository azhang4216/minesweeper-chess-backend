import mongoose from 'mongoose';
const { Schema } = mongoose;
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

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
        ref: 'RecordedGame',
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
    // verification for when user signs up
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    // verification for when user resets password
    resetPasswordToken: String,
    resetPasswordExpires: Date,
}, {
    toJSON: { virtuals: true },
    timestamps: true,
});

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

export default UserModel;