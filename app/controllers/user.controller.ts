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

/**
 * Register a Github ID for a course
 * @return {IUserDocument} All courses in DB
 */
function validateRegistration(req: any, res: any, next: restify.Next) {

  let query = User.findOne({ csid : req.csid, snum : req.snum }).exec();

  function isAlreadyRegistered(user: IUserDocument) {
    if (user.username !== '') {
      return true;
    }
    return false;
  }

  return query.then( user => {
    if (user === null) {
      return Promise.reject(Error('Unable to validate CSID and SNUM'));
    } else if (isAlreadyRegistered(user)) {
      return Promise.reject(Error('User is already registered'));
    } else {
      return res.redirect('/auth/github/register', next);
    }
  });
}

/**
 * Register a Github ID for a course
 * @return {IUserDocument} All courses in DB
 */
function addGithubUsername(req: any) {
  logger.info('addGithubUsername() in Courses Controller');
  let query = User.find({}).exec();

  return query.then( result => {
    if ( result === null ) {
      return Promise.reject(Error('No courses found in Courses DB'));
    } else {
      return Promise.resolve(result);
    }
  });
}

export { login, logout, checkRegistration, load, validateRegistration, addGithubUsername };