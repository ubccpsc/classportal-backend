import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { Student, IStudentDocument } from '../models/student.model';
import { logger } from '../../utils/logger';

function loadAdmin(): Promise<any> {
  return Promise.resolve('admin');
}

function loadStudent(): Promise<any> {
  const data = {
    'student': {
      username: 'mksarge',
      csid: 'a',
      snum: 'a',
      firstname: 'a',
      lastname: 'a',
    },
  };
  return Promise.resolve(data);
}

/**
 * Load data needed to display portal
 *
 */
function loadPortal(req: restify.Request, res: restify.Response, next: restify.Next) {
  // check if admin
  if (req.params.admin) {
    return loadAdmin()
      .then((data) => {
        res.json(200, data);
        return next();
      })
      .catch(err => next(err));
  } else {
    return loadStudent()
      .then((data) => {
        res.json(200, data);
        return next();
      })
      .catch(err => next(err));
  }
}

export { loadPortal }
