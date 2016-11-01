import {hashSync} from 'bcrypt';
import {IDBUser} from './interfaces';
import {config} from './config';
/**
 * Created by Ron on 02/10/2016.
 */
const users = new Map<string, IDBUser>([['test', {
    username: 'test',
    hash: hashSync('testtest', config.auth.SALT_ROUNDS)
}]]);

const googleToUsername = new Map<string, string>();
const facebookToUsername = new Map<string, string>();
const twitterToUsername = new Map<string, string>();

export const dbSaveUser = async (user: IDBUser) => {
    if (users.has(user.username)) {
        throw new Error('Username already exists');
    }
    users.set(user.username, Object.assign({}, user));
    if (user.google) {
        googleToUsername.set(user.google, user.username);
    }
     if(user.facebook){
        facebookToUsername.set(user.facebook,user.username);
    }
    if (user.twitter) {
        twitterToUsername.set(user.twitter, user.username);
    }
    return Object.assign({}, user);
};

export const dbGetUser = async (username: string) => {
    const user = users.get(username);
    if (!user) {
        return null;
    }
    return Object.assign({}, user);
};

//todo see https://github.com/Microsoft/TypeScript/issues/11233
export const dbUpdateUser = async (username: string, userUpdate: any /* subset IDBUser */) => {
    const user = await dbGetUser(username);
    if (!user) {
        throw new Error('User was not found');
    }
    Object.assign(user, userUpdate);
    users.set(user.username, user);
    if (user.google) {
        googleToUsername.set(user.google, user.username);
    }
    if (user.facebook) {
        facebookToUsername.set(user.facebook, user.username);
    }
    if (user.twitter) {
        twitterToUsername.set(user.twitter, user.username);
    }
    return user;
};


export const dbGetUserByGoogle = async (google: string) => {
    const username = googleToUsername.get(google);
    if (!username) {
        throw new Error("User doesn't exists");
    }
    const user = users.get(username);
    if (!user) {
        throw new Error("User doesn't exists");
    }
    return Object.assign({}, user);
};

export const dbGetUserByFacebook = async (facebook: string) => {
    const username = facebookToUsername.get(facebook);
    if (!username) {
        throw new Error("User doesn't exists");
    }
    const user = users.get(username);
    if (!user) {
        throw new Error("User doesn't exists");
    }
    return Object.assign({}, user);
};

export const dbGetUserByTwitter = async (twitter: string) => {
    const username = twitterToUsername.get(twitter);
    if (!username) {
        throw new Error("User doesn't exists");
    }
    const user = users.get(username);
    if (!user) {
        throw new Error("User doesn't exists");
    }
    return Object.assign({}, user);
};

export const dbGoogleIdExists = async (google: string) => {
    return googleToUsername.has(google);
};

export const dbFacebookIdExists = async (facebook: string) => {
    return facebookToUsername.has(facebook);
};

export const dbTwitterIdExists = async (twitter: string) => {
    return twitterToUsername.has(twitter);
};