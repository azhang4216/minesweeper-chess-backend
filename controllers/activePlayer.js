import { OnlineUser } from '../models';
import { RESPONSE_CODES } from '../constants';

/**
 * @description retrieves user object
 * @param {String} playerId player id (could be username or guest UUID)
 * @returns {Promise<OnlineUser>} promise that resolves to user object or error
 */
export const getPlayerById = async (playerId) => {
    try {
        const player = await OnlineUser.findOne({ playerId });
        if (player) {
            return {
                ...RESPONSE_CODES.SUCCESS,
                player,
            };
        }
        return RESPONSE_CODES.NOT_FOUND;
    } catch (error) {
        console.log(error);
        return RESPONSE_CODES.NOT_FOUND;
    }
};

