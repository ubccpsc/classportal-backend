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

// checks to see if course already on user. If not, then adds Course reference under User object.
let addCourseDataToUser = function(user: IUserDocument, course: ICourseDocument): Promise<ICourseDocument> {
  let courseAlreadyInUser: boolean;
  courseAlreadyInUser = user.courses.indexOf(course._id) >= 0 ? true : false;

  if (!courseAlreadyInUser) {
    user.courses.push(course._id);
  }
  return user.save().then(() => {
    return course;
  });
};

function getAdmins(payload: any) {
  return Course.findOne({ courseId: payload.courseId })
    .populate({ path: 'admins', select: 'fname lname snum csid username _id' })
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

function addLabList(reqFiles: any, courseId: string) {
  console.log(reqFiles);
  const options = {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  };

  let rs = fs.createReadStream(reqFiles['labList'].path);
  let parser = parse(options, (err, data) => {
    
    let courseQuery = Course.findOne({ 'courseId': courseId }).exec();
    let usersRepo = User;
    let newLabSections: any = [];

    Object.keys(data).forEach((key: string) => {
      let student = data[key];
      logger.info('Parsing student into user model: ' + JSON.stringify(student));
      usersRepo.findOne({
        csid : student.CSID,
        snum : student.SNUM,
      })
        .then(user => {
          courseQuery
            .then((course: ICourseDocument) => {

              let labSectionExists: Boolean = false;

              let random = course.labSections.some( function(labSection: any) {
                if (labSection.labId === student.LAB) {
                  labSectionExists = true;
                }
                return labSection.labId === student.LAB;
              });

              // creates lab section if it does not exist
              if (!labSectionExists) {
                console.log('CREATES Lab SECTION');
                newLabSections.push({ 'labId' : student.LAB, 'users': new Array() });
              }

              for (let i = 0; i < newLabSections.length; i++) {
                if (student.LAB === newLabSections[i].labId && newLabSections[i].users.indexOf(user._id) < 0) {
                  newLabSections[i].users.push(user._id);
                }
              }

              course.labSections = newLabSections;
              course.save();
              return course;
            });
        })
        .catch( (err) => { 
          logger.error(`CourseController::updateLabList ERROR ${err}`);
        });
      });
    
    if (err) {
      throw Error(err);
    }
  });

  rs.pipe(parser);

  return Course.findOne({ courseId })
    .populate({ path: 'labSections.courses' })
    .exec()
    .then(( course: ICourseDocument) => {
      return course;
    })
    .catch(err => {
      logger.error(`CourseController::addLabList ERROR ${err}`);
    });
}


function getLabSectionsFromCourse(req: any): Promise<object> {
  return Course.findOne({ courseId: req.params.courseId })
    .populate({ path: 'labSections.courses', select: 'labSections' })
    .exec()
    .then((course: ICourseDocument) => {
      return course;
    });
}


function getCourseLabSectionList(req: any): Promise<object> {
  return Course.findOne({ courseId: req.params.courseId })
    .populate({ path: 'labSections.courses', select: 'fname lname' })
    .exec()
    .then((course: ICourseDocument) => {
      return course;
    });
}



/**
 * Update a class list
 * Input: CSV
 */

function updateClassList(reqFiles: any, courseId: string) {
  console.log(reqFiles['classList']);
  const options = {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  };

  let rs = fs.createReadStream(reqFiles['classList'].path);
  let parser = parse(options, (err, data) => {
    
    let courseQuery = Course.findOne({ 'courseId': courseId });
    let lastCourseNum = null;
    let course = null;
    let newClassList = new Array<object>();
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
          courseQuery
            .then( c => {
              // add new Course information to User object
              return addCourseDataToUser(user, c);
            })
            .then(() => {
              courseQuery
              .exec()
              .then( c => {
                c.classList = newClassList;
                c.save();
                return c;
              });
            });
        })
        .catch( (err) => { 
          logger.error(`CourseController::updateClassList ERROR ${err}`);
        });
    }
    
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
  return Course.findOne({ 'courseId': courseId })
    .populate({ path: 'classList', 
      select: 'snum csid fname lname username userrole id courses' })
    .exec()
    .then(course => {
      if (!course) {
        console.log(course);
        return Promise.reject(Error('Course #' + courseId + ' does not exist.'));
      } else {
        return Promise.resolve(course.classList);
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
  let query = Course.find({}, 'courseId minTeamSize maxTeamSize studentsSetTeams description icon name -_id')
    .sort({ courseId: -1 }).exec();

  return query.then( result => {
    if ( result === null ) {
      return Promise.reject(Error('No courses found in Courses DB'));
    } else {
      return Promise.resolve(result);
    }
  });
}

/**
 * Gets user role
* @param {restify.Request} restify request object
* @param {restify.Response} restify response object
* @returns an array of Courses for user
 */
function getStudentCourseList(req: any): Promise<object[]> {

  return User.findOne({ username: req.user.username })
    .populate({ path: 'courses.courseId', select: 'courseId name icon description' })
    .exec()
    .then((user: IUserDocument) => {
      return user.courses;
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
* Gets logged in username
* @param {restify.Request} restify request object
* @returns {boolean} true value if valid CSID/SNUM aka. real user in database
**/
function getCourseSettings(req: restify.Request): Promise<object> {
  let courseId = req.params.courseId;
  return Course.findOne({ courseId: req.params.courseId })
    .then((course: ICourseDocument) => {
      if (course) {
        return Promise.resolve(course.settings);
      } else {
        return Promise.reject(`CourseController::GetCourseSettings Could not find course ${courseId}`);
      }
    });
} 



/**
 * Create a team
 */
function remove(req: restify.Request, res: restify.Response, next: restify.Next) {
  logger.info('remove() in Courses Controller');
  res.json(200, 'remove team');
  return next();
}

export { get, create, update, updateClassList, remove, addLabList, getClassList, getStudentNamesFromCourse, 
         addAdmins, getAdmins, getStudentCourseList, getCourseSettings, getLabSectionsFromCourse, 
         getCourseLabSectionList }
