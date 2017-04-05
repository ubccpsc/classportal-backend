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
function consoleLogRequest(req: restify.Request) {
  console.log(req);
  return Promise.resolve('test').catch((err) => { console.log(err); } );
}

export { consoleLogRequest };

