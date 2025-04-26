/* 
    Code taken from:
    https://www.geeksforgeeks.org/elo-rating-algorithm/,
    with minor edits on my end
*/

// Function to calculate the Probability
function probability(rating1, rating2) {
    // Calculate and return the expected score
    return 1 / (1 + Math.pow(10, (rating1 - rating2) / 400));
};

// Function to calculate Elo rating
// K is a constant.
// outcome determines the outcome: 1 for white win, 0 for black win, 0.5 for draw.
function eloRatingChange(whiteRating, blackRating, outcome, K=30) {
    // Calculate the Winning Probability of the players
    let blackProbability = probability(whiteRating, blackRating);
    let whiteProbability = probability(blackRating, whiteRating);

    // Calculate the elo changes accordingly
    const whiteRatingChange = Math.round(K * (outcome - whiteProbability));
    const blackRatingChange = Math.round(K * ((1 - outcome) - blackProbability));

    // Round to nearest whole number
    return [whiteRatingChange, blackRatingChange];
};

module.exports = eloRatingChange;
