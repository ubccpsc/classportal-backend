import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import {IUserDocument, User} from '../models/user.model';
import {logger} from '../../utils/logger';
import {config} from '../../config/env';
import * as request from '../helpers/request';
import {passport} from '../../config/auth';


/**
 * User logout
 * @param {restify.Request} restify request object
 * @param {restify.Response} restify response object
 * @param {restify.Next} restify next object
 * @returns {void}
 **/
function logout(req: any, res: any, next: any) {
  logger.info('auth.controller::logout(..) - start');
  return Promise.resolve(req.logout())
    .catch((err) => logger.info('auth.controller::logout(..) - Error logging out: ' + err));
}

/**
 * Provides callback token authorization for Passport JS
 * @param {restify.Request} restify request object
 * @param {restify.Response} restify response object
 * @param {restify.Next} restify next object
 * @returns {void}
 **/
function oauthCallback(req: any, res: any, next: restify.Next) {
  logger.info('auth.controller::oauthCallback(..) - start');
  let authenticate = function () {
    return Promise.resolve(passport.authenticate('github', {failureRedirect: '/failed'}));
  };
  return authenticate()
    .then(res.redirect('/', next))
    .catch((err) => logger.info('auth.controller::oauthCallback(..)::authenticate() - Error authenticating user: ' + err));
}

/**
 * Gets user role
 * @param {restify.Request} restify request object
 * @param {restify.Response} restify response object
 * @param {restify.Next} restify next object
 * @returns {string} that holds username in string
 */
function addTokenToDB(req: any, res: any): Promise<string> {
  console.log('auth.controller::addTokenToDB(..) - start; user: ' + req.user);
  console.log('auth.controller::addTokenToDB(..) - isAuthenticated? : ' + req.isAuthenticated());
  return Promise.resolve(res.json(200, {user: req.user.role}))
    .catch((err) => {
      logger.info('auth.controller::addTokenToDB(..) - Error loading user info: ' + err);
    });
}

/**
 * Gets user role
 * @param {restify.Request} restify request object
 * @param {restify.Response} restify response object
 * @param {restify.Next} restify next object
 * @returns a User object
 */
function getCurrentUser(req: any, res: any, next: any): Promise<object> {
  return Promise.resolve(res.json(200, {user: req.user}))
    .catch((err) => {
      logger.info('auth.controller::getCurrentUser(..) - Error loading user info: ' + err);
    });
}

/**
 * Gets logged in username
 * @param {restify.Request} restify request object
 * @param {restify.Response} restify response object
 * @param {restify.Next} restify next object
 * @returns {object} that holds username in string
 **/
function getUser(req: any, res: any, next: any) {
  return Promise.resolve(res.json(200, {user: req.user}))
    .catch((err) => {
      logger.info('Error loading user info: ' + err);
    });
}


/**
 * Gets logged in username
 * @param {restify.Request} restify request object
 * @param {restify.Response} restify response object
 * @param {restify.Next} restify next object
 * @returns {boolean} true value if valid CSID/SNUM aka. real user in database
 **/
function isAuthenticated(req: any, res: any, next: any): Promise<boolean> {
  if (typeof req.user !== 'undefined') {
    return User.findOne({username: req.user.username})
      .then((user: IUserDocument) => {
        if (user) {
          return true;
        } else {
          return false;
        }
      });
  } else {
    return Promise.resolve(false);
  }
}

export {logout, getUser, oauthCallback, getCurrentUser, addTokenToDB, isAuthenticated};
