import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { ICourseDocument, Course } from '../models/course.model';
import { IUserDocument, User, CourseData } from '../models/user.model';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';
import * as request from '../helpers/request';

let updateUserrole = function(u: IUserDocument, c: ICourseDocument, userrole: string) {
  for ( let i = 0; i < u.courses.length; i++ ) {
    if ( u.courses[i].courseId == c._id ) {
      u.courses[i].role = userrole;
    }
  }
  return u.save();
};

let addCourseDataToUser = function(user: IUserDocument, course: ICourseDocument) {
  let courseAlreadyInUser: boolean;
  courseAlreadyInUser = user.courses.some( function(c: CourseData) {
    return course._id.equals(c.courseId);
  });
  if (!courseAlreadyInUser) {
    user.courses.push({ courseId: course._id, role: null , team: null, repos: null });
  }
  return user.save();
};

function getAdmins(payload: any) {
  return Course.findOne({ courseId: payload.courseId })
    .populate({ path: 'admins', select: 'fname lname snum csid username -_id' })
    .then( c => {
      if ( c !== null && c.admins.length < 1) {
        return Promise.reject(Error('There are no admins under course ' + payload.courseId + '.'));
      } else if ( c !== null ) {
        return Promise.resolve(c);
      } else {
        return Promise.reject(Error('Course ' + payload.courseId + ' does not exist.'));
      }
    });
}

function addAdmins(payload: any) {
  let userQuery = User.findOne({
     'username': payload.username,
     'fname' : payload.fname,
     'lname' : payload.lname,
    }).exec();
  let courseQuery = Course.findOne({ 'courseId': payload.courseId }).populate('admins courses').exec();
  let user_id: string;

  return courseQuery.then( c => {
    if ( c === null ) {
      throw(Error('Course ' + payload.courseId + ' cannot be found.'));
    }

    return userQuery.then( u => {
      let throwUserError: boolean;
      let userAlreadyAdmin: boolean;
      if (u !== null) {
        user_id = u._id;
        userAlreadyAdmin = c.admins.some( function(user: IUserDocument) {
          console.log('this is runnning ');
          return user._id.equals(user_id);
        });
      } else {
        throwUserError = true;
      }

      if (userAlreadyAdmin) {
        return Promise.reject(Error('Admin already exists in ' + c.courseId + '.'));
      } else if (throwUserError) {
        return Promise.reject(Error('Admin does not exist. Please double-check that payload is correct.'));
      } else {
        updateUserrole(u, c, payload.userrole)
          .then( () => {
            c.admins.push(user_id);
            c.save();
          });
      }
      return Promise.resolve(c);
    });
  });
}

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
      })
        .then(user => {
          newClassList.push(user);
          courseQuery
            .then( c => {
              return addCourseDataToUser(user, c);
            });
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

function getClassList(courseId: string) {
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

function getStudentNamesFromCourse(courseId: string) {
  let courseQuery = Course.findOne({ 'courseId': courseId })
    .populate({ path: 'classList', select: '_id fname lname' }).exec();

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

export { get, create, update, remove, updateClassList, getClassList, getStudentNamesFromCourse, addAdmins,
         getAdmins, }
