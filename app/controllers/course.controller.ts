import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { ICourseDocument, Course } from '../models/course.model';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';
import * as request from '../helpers/request';

/**
 * Get a list of courses
 * @return Course[] All courses in DB
 */
function get(req: restify.Request) {
  logger.info('get() in Courses Controller');
  let query = Course.find({}, 'courseId icon name -_id').sort({ courseId: -1 }).exec();

  return query.then( result => {
    if ( result === null ) {
      return Promise.reject(Error('No courses found in Courses DB'));
    } else {
      return Promise.resolve(result);
    }
  });
}

/**
 * Create a team
 */

function create(course: ICourseDocument) {
  logger.info('create() in Courses Controller');
  let query = Course.findOne({ 'courseId': course.courseId }).exec();

  return query.then( result => {
    if ( result === null ) {
      return Course.create(course);
    } else {
      return Promise.reject(Error('Course ' + course.courseId + ' already exists'));
    }
  });
}

/**
 * Create a team
 */
function update(req: restify.Request, res: restify.Response, next: restify.Next) {
  logger.info('update() in Courses Controller');
  res.json(200, 'update team');
  return next();
}

/**
 * Create a team
 */
function remove(req: restify.Request, res: restify.Response, next: restify.Next) {
  logger.info('remove() in Courses Controller');
  res.json(200, 'remove team');
  return next();
}

export { get, create, update, remove }
