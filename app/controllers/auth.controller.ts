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
* @param {restify.Response} restify request object
* @param {restify.Next} restify request object
**/
function logout(req: any, res: any, next: any) {
  return Promise.resolve(req.logout())
    .catch((err) => logger.info('Error logging out: ' + err));
}

/**
Logins user using Github OAuth Strategy and Passport Plug-in
**/
// function loginUser() {
//   return Promise.resolve(passport.authenticate('github'))
//     .catch((err) => logger.info('Error logging in: ' + err));
// }

// function authenticateUser(req: any, res: any, next: restify.Next) {

//   const authenticate = passport.authenticate('github', { failureRedirect: '/failed' });
//   ( req: restify.Request, res: any, next: restify.Next) => {
//     res.redirect('/', next);
//   };

//   return Promise.resolve(authenticate)
//     .catch((err) => logger.info('Error authenticating user: ' + err));
// }


export { logout };