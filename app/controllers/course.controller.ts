import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { ICourseDocument, Course } from '../models/course.model';
import { IUserDocument, User } from '../models/user.model';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';
import * as request from '../helpers/request';


/**
 * Update a class list
 * Input: CSV
 */

function updateClassList(classList: any, courseId: string) {

  const options = {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  };

  let rs = fs.createReadStream(classList.path);
  let parser = parse(options, (err, data) => {

    let lastCourseNum = null;
    let course = null;
    let newClassList = new Array();
    let usersRepo = User;

    for (let key in data) {
      let student = data[key];
      logger.info('Parsing student into user model: ' + JSON.stringify(student));
      usersRepo.findOrCreate({
        csid : student.CSID,
        snum : student.SNUM,
        lname : student.LAST,
        fname : student.FIRST,
        username : student.USERNAME,
      })
        .then(user => {
          newClassList.push(user);
        })
        .catch( (err) => { logger.info('Error creating user in class controller' + err); });
    }

    let courseQuery = Course.findOne({ 'courseId': courseId });

    courseQuery
      .exec()
      .then( c => {
        c.classList = newClassList;
        c.save();
        return c;
      })
        .catch((err) => logger.info('Error retrieving course information: ' + err));

    if (err) {
      throw Error(err);
    }
  });

  rs.pipe(parser);

  return Course.findOne({ 'courseId': courseId })
    .then( c => {
      if (c) {
        return Promise.resolve(c);
      }
      return Promise.reject(Error('Course #' + courseId + ' does not exist. ' +
        'Cannot add class list to course that does not exist.'));
    });
}

function readClassList(courseId: string) {
  let courseQuery = Course.findOne({ 'courseId': courseId })
    .populate({ path: 'classList', select: 'snum fname lname teamUrl' }).exec();

  return courseQuery.then(result => {
    if ( result === null ) {
      return Promise.reject(Error('Course #' + courseId + ' does not exist'));
    } else {
      return Promise.resolve(result.classList);
    }
  });
}


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

export { get, create, update, remove, updateClassList, readClassList }
