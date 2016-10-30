import * as express from 'express';
import { Request, Response } from 'express';
import * as rp from 'request-promise';
import * as jwtMiddleware from 'express-jwt';
import { JsonWebTokenError } from 'jsonwebtoken';
import { validateAsync, loginValidationSchema, isValidationError, toTokenUser, RequestWithUser, compareAsync, encryptAsync, sendTokenAsync, verifyTokenAsync } from './helpers';
import { config } from './config';
import { IDBUser, ITokenUser, ILoginData, IGoogleProfile, IFacebookProfile } from './interfaces';
import { dbSaveUser, dbUpdateUser, dbGetUser, dbGetUserByGoogle, dbGetUserByFacebook, dbGoogleIdExists, dbFacebookIdExists } from './storage';

/**
 * Created by Ron on 02/10/2016.
 */
export const authRoutes = express.Router()
    .post('/login', login)
    .post('/signup', signup)
    .get('/refresh', refresh)
    .use(jwtMiddleware({
        secret: config.auth.TOKEN_SECRET,
        credentialsRequired: false
    }))
    .post('/google', google)
    .post('/facebook', facebook)


export async function signup(request: Request, response: Response) {
    try {
        const user: IDBUser = <any>{};
        const signupData = await validateAsync(request.body, loginValidationSchema);
        user.username = signupData.username;
        user.hash = await encryptAsync(signupData.password);
        await dbSaveUser(user);
        return await sendTokenAsync(response, {username: user.username});
    } catch (err) {
        if (err instanceof Error) {
            if (isValidationError(err)) {
                //issue with joi type definition
                console.log((<any>err).annotate());
                return response.sendStatus(422);
            }
            if (err.message === 'Username already exists') {
                return response.status(409).send(err.message);
            }
        }
        console.error(err);
        return response.sendStatus(500);
    }
}


export async function refresh(request: Request, response: Response) {
    try {
        const authorization = request.header("Authorization");
        if (!authorization || !authorization.includes(' ')) {
            return response.status(401).send('No Token');
        }
        const encodedToken = authorization.split(' ')[1];
        const token: ITokenUser & {exp: number} =
            await verifyTokenAsync(encodedToken, config.auth.TOKEN_SECRET, {ignoreExpiration: true});
        if (+token.exp * 1000 + 10 * 60 * 1000 < Date.now()) {//10 minutes
            return response.status(400).send('Outdated Token');
        }
        const user = await dbGetUser(token.username);
        if (!user) {
            return response.status(400).send('User does not exist');
        }
        return await sendTokenAsync(response, toTokenUser(user));
    } catch (err) {
        if (err instanceof JsonWebTokenError) {
            return response.status(400).send('Invalid Token');
        }
        console.error(err);
        return response.sendStatus(500);
    }
}

export async function login(request: Request, response: Response) {
    try {
        const login: ILoginData = await validateAsync(request.body, loginValidationSchema);
        const user = await dbGetUser(login.username);
        if (!user || !user.hash) { //user does not have a password, only google account
            return response.status(401).send('Bad username or password');
        }
        const passwordMatch = await compareAsync(login.password, user.hash);
        if (!passwordMatch) {
            return response.status(401).send('Bad username or password');
        }
        return await sendTokenAsync(response, toTokenUser(user));
    } catch (err) {
        if (err instanceof Error && isValidationError(err)) {
            //issue with joi type definition
            console.log((<any>err).annotate());
            return response.sendStatus(422);
        }
        console.error(err);
        return response.sendStatus(500);
    }
}


export async function google(req: RequestWithUser, res: Response) {
    const accessTokenUrl = 'https://www.googleapis.com/oauth2/v3/token'; //'https://accounts.google.com/o/oauth2/token';
    const peopleApiUrl = 'https://www.googleapis.com/plus/v1/people/me/openIdConnect';
    const params = {
        code: req.body.code,
        client_id: req.body.clientId,
        client_secret: config.auth.GOOGLE_SECRET,
        redirect_uri: req.body.redirectUri,
        grant_type: 'authorization_code'
    };
    // Step 1. Exchange authorization code for access token.
    const {access_token} = await rp.post(accessTokenUrl, {json: true, form: params});
    const headers = {Authorization: 'Bearer ' + access_token};
    // Step 2. Retrieve profile information about the current user.
    const profile: IGoogleProfile = await rp.get({url: peopleApiUrl, json: true, headers});
    // Step 3a. Link user account.
    if (req.user) {
        if (await dbGoogleIdExists(profile.sub)) {
            return res.status(409).send('Google profile already linked');
        }
        const user = await dbUpdateUser(req.user.username, {
            google: profile.sub,
            picture: profile.picture.replace('sz=50', 'sz=200'),
            displayName: req.user.displayName || profile.name
        });
        return await sendTokenAsync(res, toTokenUser(user));
    }
    // Step 3b. Create a new user account
    const googleIdExists = await dbGoogleIdExists(profile.sub);
    if (!googleIdExists) {
        const user = await dbSaveUser({
            username: profile.email,
            google: profile.sub,
            picture: profile.picture.replace('sz=50', 'sz=200'),
            displayName: profile.name
        });
        return await sendTokenAsync(res, toTokenUser(user));
    }
    // 3c. return an existing user
    const user = await dbGetUserByGoogle(profile.sub);
    return await sendTokenAsync(res, toTokenUser(user));
}
//t
export async function facebook(req: RequestWithUser, res: Response) {
    try {
        const fields = ['id', 'email', 'first_name', 'last_name', 'link', 'name', 'picture'];
        const accessTokenUrl = 'https://graph.facebook.com/v2.5/oauth/access_token';
        const graphApiUrl = 'https://graph.facebook.com/v2.5/me?fields=' + fields.join(',');
        const params = {
            code: req.body.code,
            client_id: req.body.clientId,
            client_secret: config.auth.FACEBOOK_SECRET,
            redirect_uri: req.body.redirectUri
        };
        // Step 1. Exchange authorization code for access token.
        const access_token = await rp.get(accessTokenUrl, { json: true, qs: params });
        // Step 2. Retrieve profile information about the current user.
        const profile: IFacebookProfile = await rp.get({ url: graphApiUrl, json: true, qs: access_token });
        // Steip 3a. Checkes if the clients account is already linked with this facebook account
        if (req.user) {
            if (await dbFacebookIdExists(profile.id)) {
                return res.status(409).send('Facebook profile already linked');
            }
            // If the users isn't linked to this facebook account then we update the current account with the clients facebook profile
            const user = await dbUpdateUser(req.user.username, {
                facebook: profile.id,
                picture: profile.picture.data.url, //profile.picture.replace('sz=50', 'sz=200'),
                displayName: req.user.displayName || profile.name
            });
            return await sendTokenAsync(res, toTokenUser(user));
        }
        // Step 3b. Create a new user account
        const facebookIdExists = await dbFacebookIdExists(profile.id);
        if (!facebookIdExists) {
            const user = await dbSaveUser({
                username: profile.name,
                facebook: profile.id,
                picture: profile.picture.data.url,
                displayName: profile.name
            });
            return await sendTokenAsync(res, toTokenUser(user));
        }
        // 3c. return an existing user
        const user = await dbGetUserByFacebook(profile.id);
        return await sendTokenAsync(res, toTokenUser(user));
    } catch (err) {
        console.log(err);
        return await res.sendStatus(500);
    }
}