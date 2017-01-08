import * as restify from 'restify';
import { Student, IStudentDocument } from '../models/student.model';
import { logger } from '../../utils/logger';

/**
 *
 */
function checkId(req: any, res: any, next: any) {
  // not really implemented
  return Promise.resolve()
    .then(() => {
      res.json(200, true);
      return next();
    })
    .catch((err) => next(err));
}

/**
 *
 */
function getUsernameFromToken(req: any, res: any, next: any) {
  // not really implemented
  req.params.username = req.params.token;
  return next();
}

/**
 *
 */
function register(req: restify.Request, res: restify.Response, next: restify.Next) {
  const student = req.params.student;
  student.username = req.params.username;

  return student
    .save()
    .then((updatedStudent: IStudentDocument) => {
      res.json(200, updatedStudent);
      return next();
    })
    .catch((err: any) => next(err));
}

export { checkId, getUsernameFromToken, register };
