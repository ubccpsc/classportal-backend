import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { IUserDocument, User } from '../models/user.model';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';
import * as request from '../helpers/request';

/**
 * User login
 * @param {string} authcode - GitHub authcode
 * @returns {string} servertoken
 */
function login(authcode: string, csid: string, snum: string) {
  return Promise.resolve(authcode)
    .then(request.retrieveAccessToken)
    .then(request.retrieveUsername)
    .then((username: string) => {
      return User.findWith({ username })
        .then((user: any) => {
          return Promise.resolve(user);
        })
        .catch(() => {
          return User.findWith({ csid, snum })
            .then((user: any) => {
              return Promise.resolve(user);
            })
            .catch(() => {
              return Promise.reject('Could not find user by username or by csid!');
            });
        });
    })
    .then((user: IUserDocument) => user.createServerToken())
    .catch(Promise.reject);
}

/**
 * Search for a user by csid and snum, and append it to req.params if successful.
 * @returns {Promise<IUserDocument>}
 */
function checkRegistration(csid: string, snum: string): Promise<IUserDocument> {
  if ( !csid && !snum ) {
    return Promise.reject('CSID and SNUM not supplied');
  } else {
    return User.findOne({ 'csid': csid, 'snum' : snum }).exec() || Promise.reject('User does not exist');
  }
}

/**
 * Logout by deleting server token
 */
function logout(user: IUserDocument) {
  return user.deleteServerToken()
    .catch(Promise.reject);
}

/**
 * Load data needed to display portal
 */
function load(user: IUserDocument) {
  return Promise.resolve(user)
    // .then(loadGrades)
    .then((user: IUserDocument) => {
      // todo: add more things to userdata
      return Object.assign({}, user);
    })
    .catch(Promise.reject);
}

function register(userInfo: any) {
  return User;
}

export { login, logout, checkRegistration, load, register };

/*

/**
 * Search for a user by username, and append it to req.params if successful.
 * @returns {IUserDocument}
 /
function load(req: restify.Request, res: restify.Response, next: restify.Next) {
  // check for supplied username
  if (req.params.username) {
    User.findByUsername(req.params.username)
      .then((user: IUserDocument) => {
        req.params.user = user;
        return next();
      })
      .catch((err: any) => next(err));
  } else {
    const err = 'Err: Could not load user';
    logger.info(err);
    res.json(500, err);
    return next(err);
  }
}

/**
 * Get a user.
 * @returns {IUserDocument}
 /
function get(req: restify.Request, res: restify.Response, next: restify.Next) {
  res.json(200, req.params.user);
  return next();
}

/**
 * Create a new user from a username, and return it.
 * @property {string} req.params.username - the GitHub username of the user
 * @returns {IUserDocument}
 /
function create(req: restify.Request, res: restify.Response, next: restify.Next) {
  const user: IUserDocument = new User({
    csid: req.params.csid,
    snum: req.params.snum,
    lastname: req.params.lastname,
    firstname: req.params.firstname,
  });

  return user
    .save()
    .then((savedUser: IUserDocument) => {
      res.json(200, savedUser);
      return next();
    })
    .catch((err: any) => next(err));
}

/**
 * Update an existing user, and return it.
 * @property {string} req.params.original - the original username
 * @property {string} req.params.new - the new username
 * @returns {IUserDocument}
 /
function update(req: restify.Request, res: restify.Response, next: restify.Next) {
  const user = req.params.user;
  user.username = req.params.newUsername;

  return user
    .save()
    .then((updatedUser: IUserDocument) => {
      res.json(200, updatedUser);
      return next();
    })
    .catch((err: any) => next(err));
}

/**
 * Delete a user, and return it. (??)
 * @returns {IUserDocument}
 /
function remove(req: restify.Request, res: restify.Response, next: restify.Next) {
  const user = req.params.user;

  return user
    .remove()
    .then((deletedUser: IUserDocument) => {
      res.json(200, deletedUser);
      return next();
    })
    .catch((err: any) => next(err));
}
*/
