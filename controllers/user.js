import bcrypt from 'bcrypt';
import jwt from 'jwt-simple';

import { User } from '../models';
import { RESPONSE_CODES } from '../constants';

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
 * @description creates user object in database
 * @param {Object} fields user info fields (email, first_name, and password required)
 * @returns {Promise<User>} promise that resolves to user object or error
 */
export const createUser = async (fields) => {
    const {
        email,
        first_name: firstName,
        last_name: lastName,
        password,
    } = fields;

    // ensure got required inputs
    if (!(email && firstName && password)) {
        throw new Error({
            code: RESPONSE_CODES.BAD_REQUEST,
            error: { message: 'Please provide email, first_name, and password' },
        });
    }

    const user = new User();

    user.first_name = firstName;
    user.last_name = lastName;
    user.email = email;
    user.salted_password = password; // pre-save hook will salt and hash this
    user.date_created = new Date();

    try {
        const savedUser = await user.save();
        return savedUser;
    } catch (error) {
        console.log(error);

        throw new Error({
            code: RESPONSE_CODES.INTERNAL_ERROR,
            error,
        });
    }
};

/**
 * @description update user object
 * @param {String} id id of user to update
 * @param {String} fields fields for user to update
 * @returns {Promise<User>} promise that resolves to user object or error
 */
export const updateUser = async (id, fields) => {
    const {
        id: providedId,
        _id: providedUnderId,
        password,
    } = fields;

    // reject update of id
    if (providedId || providedUnderId) {
        throw new Error({
            code: RESPONSE_CODES.BAD_REQUEST,
            error: { message: 'Cannot update user id' },
        });
    }

    try {
        await User.updateOne({ _id: id }, fields);

        const user = await User.findById(id);

        if (password) {
            user.salted_password = password;
        }

        await user.save();

        return {
            ...RESPONSE_CODES.SUCCESS,
            user,
        };
    } catch (error) {
        console.log(error);

        throw new Error({
            code: RESPONSE_CODES.INTERNAL_ERROR,
            error,
        });
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