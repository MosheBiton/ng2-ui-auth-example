/**
 * Created by Ron on 02/10/2016.
 */
export const config = {
    auth: {
        SALT_ROUNDS: 10,
        TOKEN_SECRET: 'MyTokenSecret',
        // OAuth 2.0
        GOOGLE_SECRET: '<replace me>',
        FACEBOOK_SECRET: '<replace me>',

        //OAuth 1.0
        TWITTER_SECRET: '<replace me>',
    }
};