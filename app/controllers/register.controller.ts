import * as restify from 'restify';
import * as mongoose from 'mongoose';
import { Student, IStudentDocument } from '../models/student.model';
import { logger } from '../../utils/logger';

function verifyRegistration(csid: string, sid: number) {
}

function register(req: restify.Request, res: restify.Response, next: restify.Next) {
  // verify csid and sid
  verifyRegistration(req.params.csid, req.params.sid);

  // create student with info provided
  // create();

  logger.info('register');
  res.json(200, 'register');
  return next();
}

export { register };
