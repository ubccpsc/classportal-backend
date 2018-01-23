import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import {IUserDocument, User} from '../models/user.model';
import {logger} from '../../utils/logger';
import {config} from '../../config/env';
import * as request from '../helpers/request';


/**
 * Gets the logged-in Username that has been deserialized in Passport
 * @param {restify.Request}
 * @param {restify.Response}
 * @param {restify.Next}
 * @returns {string} the logged in username
 */
function getCurrentUserInfo(req: any, res: any, next: any) {
  return Promise.resolve(res.json(200, {user: req.user, headers: req.headers}))
    .catch((err) => {
      logger.info('Error loading user info: ' + err);
    });
}

export {getCurrentUserInfo};
