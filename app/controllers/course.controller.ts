import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { ICourseDocument, Course } from '../models/course.model';
import * as courseRepo from '../repos/course.repository';
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
 * @method
 * @returns {Promise.<Object, Error>} The promise returns an object if resolved.
 */

function create(course: ICourseDocument) {
  return courseRepo.addCourse(course);
}

  //   courseRepo.getAllCourses()
  //   .then( (c) => { console.log(c); })
  //   .catch(Promise.reject);

  // courseRepo.getCourseById(course.courseId)
  //   .then( (c) => { console.log(c); })
  //   .catch(Promise.reject);

function getCourse(courseId: string) {
  return courseRepo.getCourseById(courseId);
}

  //   courseRepo.getAllCourses()
  //   .then( (c) => { console.log(c); })
  //   .catch(Promise.reject);

  // courseRepo.getCourseById(course.courseId)
  //   .then( (c) => { console.log(c); })
  //   .catch(Promise.reject);

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
