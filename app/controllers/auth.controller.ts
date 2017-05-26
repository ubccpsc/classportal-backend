import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { IUserDocument, User } from '../models/user.model';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';
import * as request from '../helpers/request';
import { passport } from '../../config/auth';


/**
* User logout
* @param {restify.Request} restify request object
* @param {restify.Response} restify response object
* @param {restify.Next} restify next object
* @returns {void}
**/
function logout(req: any, res: any, next: any) {
  return Promise.resolve(req.logout())
    .catch((err) => logger.info('Error logging out: ' + err));
}

/**
* Provides callback token authorization for Passport JS
* @param {restify.Request} restify request object
* @param {restify.Response} restify response object
* @param {restify.Next} restify next object
* @returns {void}
**/
function oauthCallback(req: any, res: any, next: restify.Next) {

  let authenticate = function() {
    return Promise.resolve(passport.authenticate('github', { failureRedirect: '/failed' }));
  };
  return authenticate()
    .then(res.redirect('/', next))
    .catch((err) => logger.info('Error authenticating user: ' + err));
}

/**
 * Gets user role
* @param {restify.Request} restify request object
* @param {restify.Response} restify response object
* @param {restify.Next} restify next object
* @returns {string} that holds username in string
 */
function getUserRole(req: any, res: any, next: any) {
  return Promise.resolve(res.json(200, { user: req.user.role }))
    .catch((err) => { logger.info('Error loading user info: ' + err); });
}



/**
* Gets logged in username
* @param {restify.Request} restify request object
* @param {restify.Response} restify response object
* @param {restify.Next} restify next object
* @returns {object} that holds username in string
**/
function getUser(req: any, res: any, next: any) {
  return Promise.resolve(res.json(200, { user: req.user }))
    .catch((err) => { logger.info('Error loading user info: ' + err); });
}

export { logout, getUser, oauthCallback, getUserRole };