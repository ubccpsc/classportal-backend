import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { ICourseDocument, Course } from '../models/course.model';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';
import * as request from '../helpers/request';

/**
 * Get a team
 */
function get(req: restify.Request, res: restify.Response, next: restify.Next) {
  res.json(200, 'get team');
  return next();
}

/**
 * Create a team
 */

function create(course: ICourseDocument) {

  let query = Course.findOne({ 'courseId': course.courseId });

  return query.then( result => {
    if (result) {
      return Course.create(course);
    } else {
      return Course.create(course)
        .then((newCourse) => {
          newCourse.save(
            function(newCourse, err) {
              if (err) {
                logger.info('Error on save! \n' + err);
              } else {
                logger.info('successfully saved ' + newCourse.courseId);
              }
            },
          );
          return course;
        });
    }
  });
}

/**
 * Create a team
 */
function update(req: restify.Request, res: restify.Response, next: restify.Next) {
  res.json(200, 'update team');
  return next();
}

/**
 * Create a team
 */
function remove(req: restify.Request, res: restify.Response, next: restify.Next) {
  res.json(200, 'remove team');
  return next();
}

export { get, create, update, remove }
