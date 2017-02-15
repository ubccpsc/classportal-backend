import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { User, IUserDocument } from '../models/user.model';
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
      return User.findByUsername(username)
        .then((user: any) => {
          return Promise.resolve(user);
        })
        .catch(() => {
          return User.findByCsidSnum(csid, snum)
            .then((user: any) => {
              return Promise.resolve(user);
            })
            .catch(() => {
              return Promise.reject('Could not find user by username or by csid!');
            });
        });
    })
    .then(User.storeServerToken)
    .catch((error: any) => {
      Promise.reject(error);
    });
}

/**
 * Logout by deleting server token
 */
function logout(req: restify.Request, res: restify.Response, next: restify.Next) {
  return Promise.resolve()
    .then(User.deleteServerToken)
    .then((result: any) => {
      res.json(200, { message: result });
      return next();
    })
    .catch((error: any) => {
      res.json(400, { error });
      return next();
    });
}

/**
 * Pre-registration check
 */
function checkId(req: restify.Request, res: restify.Response, next: restify.Next) {
  return loadbyCsidSnum(req.params.csid, req.params.snum)
    .then(() => {
      res.json(200, true);
      return next();
    })
    .catch((error: any) => {
      res.json(400, { error });
      return next(error);
    });
}

/**
 * Load data needed to display portal
 */
function loadPortal(req: restify.Request, res: restify.Response, next: restify.Next) {
  const username: string = req.params.username;

  return User.findByUsername(username)
    .then((data) => {
      res.json(200, data);
      return next();
    })
    .catch(err => next(err));
}


/**
 * Search for a user by username, and append it to req.params if successful.
 * @returns {IUserDocument}
 */
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
 * Search for a user by csid and snum, and append it to req.params if successful.
 * @returns {Promise<IUserDocument>}
 */
function loadbyCsidSnum(csid: string, snum: string): Promise<IUserDocument> {
  if (!csid || !snum) {
    return Promise.reject('CSID and SNUM not supplied');
  } else {
    return User.findByCsidSnum(csid, snum)
      .then((user: IUserDocument) => {
        return Promise.resolve(user);
      });
  }
}

/**
 * Get a user.
 * @returns {IUserDocument}
 */
function get(req: restify.Request, res: restify.Response, next: restify.Next) {
  res.json(200, req.params.user);
  return next();
}

/**
 * Create a new user from a username, and return it.
 * @property {string} req.params.username - the GitHub username of the user
 * @returns {IUserDocument}
 */
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
 */
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
 */
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

export { login, logout, checkId, loadPortal };
