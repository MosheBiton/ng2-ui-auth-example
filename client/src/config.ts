import {CustomConfig} from 'ng2-ui-auth';
/**
 * Created by Ron on 03/10/2016.
 */
export const GOOGLE_CLIENT_ID = '<replace me>';
export const FACEBOOK_CLIENT_ID = '<replace me>';
export const TWITTER_KEY = '<replace me>';

export class MyAuthConfig extends CustomConfig {
    defaultHeaders = {'Content-Type': 'application/json'};
    providers = {google: {clientId: GOOGLE_CLIENT_ID}, facebook:{clientId: FACEBOOK_CLIENT_ID}, twitter:{clientId: TWITTER_KEY}};
}