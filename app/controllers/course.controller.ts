import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import {ICourseDocument, Course} from '../models/course.model';
import {IUserDocument, User, CourseData} from '../models/user.model';
import {logger} from '../../utils/logger';
import {config} from '../../config/env';
import * as request from '../helpers/request';
import {log} from 'util';

let updateUserrole = function (u: IUserDocument, c: ICourseDocument, userrole: string) {
  for (let i = 0; i < u.courses.length; i++) {
    if (u.courses[i].courseId == c._id) {
      u.courses[i].role = userrole;
    }
  }
  return u.save();
};

// checks to see if course already on user. If not, then adds Course reference under User object.
let addCourseDataToUser = function (user: IUserDocument, course: ICourseDocument): Promise<ICourseDocument> {
  let courseAlreadyInUser: boolean;
  courseAlreadyInUser = user.courses.indexOf(course._id) >= 0 ? true : false;

  if (!courseAlreadyInUser) {
    user.courses.push(course._id);
  }
  return user.save().then(() => {
    return course;
  });
};

/**
 * Gets a list of users who are Admins underneath a particular course
 * @param payload.courseId string ie. '310'
 * @return User[] A list of admins
 */
function getAllAdmins(payload: any) {
  return Course.findOne({courseId: payload.courseId})
    .populate({path: 'admins', select: 'fname lname snum csid username _id'})
    .then(c => {
      if (c !== null && c.admins.length < 1) {
        return Promise.reject(Error('There are no admins under course ' + payload.courseId + '.'));
      } else if (c !== null) {
        return Promise.resolve(c);
      } else {
        return Promise.reject(Error('Course ' + payload.courseId + ' does not exist.'));
      }
    });
}

/**
 * Gets a list of users who are Staff underneath a particular course
 * @param payload.courseId string ie. '310'
 * @return User[] A list of staff
 */
function getAllStaff(payload: any) {
  return Course.findOne({courseId: payload.courseId})
    .populate({path: 'staff', select: 'fname lname snum csid username _id'})
    .then(c => {
      if (c !== null && c.admins.length < 1) {
        return Promise.reject(Error('There are no staff under course ' + payload.courseId + '.'));
      } else if (c !== null) {
        return Promise.resolve(c);
      } else {
        return Promise.reject(Error('Course ' + payload.courseId + ' does not exist.'));
      }
    });
}

/**
 * Upload an adminList
 * Admin will be created in Users database as 'admin' userrole.
 * 
 * Pre-req #1 is that HEADERS in CSV are labelled with headers below:
 *                    HEADERS: CWL (required), FIRST (optional), LAST (optional)
 *         #2 CWL, first, last must match if already exist.
 * 
 * ** WARNING ** Uploading a adminList will overwrite the previous adminList 
 * in the Course object. Admins are never deleted from DB.
 * 
 * @param req.files as reqFiles with FS readable reqFiles['adminList'].path
 * @param courseId string ie. '310' of the course we are adding labList too
 * @return adminList object
 */
function addAdminList(reqFiles: any, courseId: string) {
  logger.info('CourseController:: addAdminList() - start');
  const ADMIN_USERROLE = 'admin';
  const options = {
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
  };

  let rs = fs.createReadStream(reqFiles['adminList'].path);
  let courseQuery = Course.findOne({'courseId': courseId}).exec();

  let parser = parse(options, (err, data) => {

    let usersRepo = User;
    let userQueries: any = [];

    Object.keys(data).forEach((key: string) => {
      let admin = data[key];
      let course: ICourseDocument;
      logger.info('CourseController:: addAdminList() Creating admin in Users if does not already ' +
         'exist for CSV line: ' + JSON.stringify(admin));
      userQueries.push(usersRepo.findOrCreate({
        username: admin.CWL,
        fname: admin.FIRST,
        lname: admin.LAST
      }).then((u: IUserDocument) => {
        // CSID and SNUM must be unique and exist on User object according to index (so throw in consistent unique value)
        u.userrole = ADMIN_USERROLE;
        u.csid = u.username;
        u.snum = u.username;
        return u.save();
      }));
    });

    courseQuery.then((course: ICourseDocument) => {
      let userIds: IUserDocument[] = [];

      return Promise.all(userQueries)
        .then((results: any) => {
          Object.keys(results).forEach((key) => {
            results[key];
            userIds.push(results[key]._id as IUserDocument);
          });

          course.admins = userIds;
          course.save();
        });
    });

    if (err) {
      throw Error(err);
    }
  });

  rs.pipe(parser);

  return Course.findOne({courseId})
    .populate({path: 'admins'})
    .exec()
    .then((course: ICourseDocument) => {
      return course.admins;
    })
    .catch(err => {
      logger.error(`CourseController::addAdminList() ERROR ${err}`);
    });
}

/**
 * Upload a staffList
 * Staff will be created in Users database as 'student' to ensure that they are seen
 * by AutoTest as students in other courses (except when in Course.staffList under particular
 * specified @param courseId)
 * 
 * Pre-req #1 is that HEADERS in CSV are labelled with headers below:
 *                    HEADERS: CWL (required) / CSID (optional) / SNUM (optional) 
 * 
 * ** WARNING ** Uploading a staffList will overwrite the previous labList 
 * in the Course object.
 * 
 * @param req.files as reqFiles with FS readable reqFiles['staffList'].path
 * @param courseId string ie. '310' of the course we are adding staffList too
 * @return staffList object
 */
function addStaffList(reqFiles: any, courseId: string) {

  const options = {
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
  };

  let rs = fs.createReadStream(reqFiles['staffList'].path);
  let courseQuery = Course.findOne({'courseId': courseId}).exec();

  let parser = parse(options, (err, data) => {

    let usersRepo = User;
    let userQueries: any = [];

    Object.keys(data).forEach((key: string) => {
      let staff = data[key];
      let course: ICourseDocument;
      logger.info('CourseController:: addStaffList() Creating staff in Users if does not already ' +
         'exist for CSV line: ' + JSON.stringify(staff));
      userQueries.push(usersRepo.findOrCreate({
        username: staff.CWL,
        csid: staff.CWL,
        snum: staff.CWL
      }).then((u: IUserDocument) => {
        return u;
      }));
    });

    courseQuery.then((course: ICourseDocument) => {
      let userIds: IUserDocument[] = [];

      return Promise.all(userQueries)
        .then((results: any) => {
          Object.keys(results).forEach((key) => {
            results[key];
            userIds.push(results[key]._id as IUserDocument);
          });

          course.staffList = userIds;
          course.save();
        });
    });

    if (err) {
      throw Error(err);
    }
  });

  rs.pipe(parser);

  return Course.findOne({courseId})
    .populate({path: 'staffList'})
    .exec()
    .then((course: ICourseDocument) => {
      return course.staffList;
    })
    .catch(err => {
      logger.error(`CourseController::addStaffList() ERROR ${err}`);
    });
}

/**
 * Upload a classList
 * Students will be created in Users database as 'student'.
 * 
 * Pre-req #1 is that HEADERS in CSV are labelled with headers below:
 *                    HEADERS: CSID	/ SNUM / LAST	/ FIRST /	CWL / LAB
 * 
 * ** WARNING ** Uploading a classList will overwrite the previous classList 
 * in the Course object. Users fields are overwritten, but original Mongo User Id
 * property always stays the same to ensure references to are kept in ongoing course
 * or other courses.
 * 
 * @param req.files as reqFiles with FS readable reqFiles['classList'].path
 * @param courseId string ie. '310' of the course we are adding classList too
 * @return classList object
 */
function updateClassList(reqFiles: any, courseId: string): Promise<ICourseDocument> {
  const GITHUB_ENTERPRISE_URL = config.github_enterprise_url;
  let shouldAddLabList: boolean = false;
  const options = {
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
  };
  let rs = fs.createReadStream(reqFiles['classList'].path);
  let courseQuery = Course.findOne({'courseId': courseId}).exec();

  return new Promise((fulfill, reject) => {
    let parser = parse(options, (err, data) => {

      let userQueries: any = [];
  
      Object.keys(data).forEach((key: string) => {
        let student = data[key];
        let course: ICourseDocument;
        console.log('HEREHERE', data[key]);
        if (typeof student.LAB !== 'undefined') {
          shouldAddLabList = true;
        }
  
        logger.info('Parsing student into user model: ' + JSON.stringify(student));
        userQueries.push(User.findOne({
          csid: student.CSID,
          snum: student.SNUM,
        }).then((u: IUserDocument) => {
          // If User already exists, return the user, or create the user and then return it
          // NOTE: We DO NOT want to overwrite already created user._id properties that are referenced
          // in other classes.
          if (u) {
            return u;
          } else {
            return User.create({
              csid:     student.CSID,
              snum:     student.SNUM,
              lname:    student.LAST,
              fname:    student.FIRST,
              username: student.CWL,
              profileUrl: GITHUB_ENTERPRISE_URL + '/' + student.CWL,
            }).then((u: IUserDocument) => {
              return u;
            });
          }
        }));
      });
  
      courseQuery.then((course: ICourseDocument) => {
  
        return Promise.all(userQueries)
          .then((results: any) => {
            console.log('CourseController::created/found User results based on classList upload =>', results);
  
            try {
              // FIRST: ADD USERS to Course.classList property
              let classList: string[] = [];
              Object.keys(results).forEach(function(key) {
                classList.push(results[key]._id);
              });
              course.classList = classList;
            } catch (err) {
              logger.error(`CourseController:: updateClassList() Create classList ERROR ${err}`);
            }
  
            // SECOND: CREATE labSections array for Course.labSections property 
            if (shouldAddLabList) {
              course.labSections = createLabList(data, results);
            } else {
              // clear any previous list
              course.labSections = new Array();
              console.log(course.labSections);
            }
            course.save()
              .then(() => {
                return Course.findOne({courseId})
                  .populate({path: 'labSections.users classList'})
                  .then((updatedCourse: ICourseDocument) => {
                    fulfill(updatedCourse);
                  });
              });
          });
      });
  
      if (err) {
        reject(err);
      }
    });
  
    rs.pipe(parser);
  });
}

/**
 * Creates a lab sections array that is returned and placed into the Course.labSections
 * property in the updateClassList() method. 
 * 
 * @param parsedData Creates a Lab list based on a course and a classList Data block upload
 * @return Course.labSections data item
 */
function createLabList(data: any, results: any) {
  let newlyCompiledLabSections: any = [];
  let labSectionsSet = new Set();

  try {            
    // SECOND: ADD LAB LIST
    Object.keys(data).forEach(function (key) {
      let student: any = data[key];
      let tentativeNewLab = String(student.LAB);
      let labSectionExists = false;
      for (let i = 0; i < newlyCompiledLabSections.length; i++) {
        let compiledLabId = String(newlyCompiledLabSections[i].labId);
        if (compiledLabId === tentativeNewLab) {
          labSectionExists = true;
        }
      }
      if (!labSectionExists) {
        newlyCompiledLabSections.push({'labId': student.LAB, 'users': new Array()});
      }
    });
  }
  catch (err) {
    logger.error(`CourseController:: Create lab sections ERROR ${err}`);
  }

  try {
    // THIRD: Add student to correct lab section
    Object.keys(data).forEach(function (key) {
      let parsedSNUM: string = String(data[key].SNUM);
      let parsedLAB: string = String(data[key].LAB);

      Object.keys(results).forEach(function (resultKey) {
        let dbStudent: IUserDocument = results[resultKey];
        let dbStudentSNUM: string = results[resultKey].snum;

        // ONLY IF student matches CSID and SNUM, add to section of parsed LabId

        if (dbStudentSNUM === parsedSNUM) {

          for (let i = 0; i < newlyCompiledLabSections.length; i++) {
            let labIdSection: string = String(newlyCompiledLabSections[i].labId);

            if (labIdSection === parsedLAB) {
              newlyCompiledLabSections[i].users.push(dbStudent._id);
              console.log('CourseController:: updateClassList() Adding Student ' + dbStudent.snum + 
                ', ' + dbStudent.csid + ', ' + dbStudent.fname + ', ' + dbStudent.lname + ' to Lab Section' 
                + labIdSection);
            }
          }
        }

      });
    });
    return newlyCompiledLabSections;
  } catch (err) {
    logger.error(`CourseController:: Add student to correct lab section ERROR ${err}`);
  }

}


function getLabSectionsFromCourse(req: any): Promise<object> {
  return Course.findOne({courseId: req.params.courseId})
    .populate({path: 'labSections.courses', select: 'labSections'})
    .exec()
    .then((course: ICourseDocument) => {
      return course;
    });
}


function getCourseLabSectionList(req: any): Promise<object> {
  return Course.findOne({courseId: req.params.courseId})
    .populate({path: 'labSections.courses', select: 'fname lname'})
    .exec()
    .then((course: ICourseDocument) => {
      return course;
    });
}

/**
 * @param courseId string ie. '310'
 * @return object[] class list of users in course
 */
function getClassList(courseId: string) {
  return Course.findOne({'courseId': courseId})
    .populate({
      path:   'classList',
      select: 'snum csid fname lname username userrole id courses'
    })
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
  let courseQuery = Course.findOne({'courseId': courseId})
    .populate({path: 'classList', select: '_id fname lname'}).exec();

  return courseQuery.then(result => {
    if (result === null) {
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
function getAllCourses(req: restify.Request) {
  logger.info('get() in Courses Controller');
  let query = Course.find({}, `courseId minTeamSize maxTeamSize studentsSetTeams description
  teamsMustBeInSameLab icon name -_id`)
    .sort({courseId: -1}).exec();

  return query.then(result => {
    if (result === null) {
      return Promise.reject(Error('No courses found in Courses DB'));
    } else {
      return Promise.resolve(result);
    }
  });
}

/**
 * Gets user role from perspective of a student
 * @param {restify.Request} restify request object
 * @param {restify.Response} restify response object
 * @returns an array of Courses for user
 */
function getMyCourses(req: any): Promise<object[]> {

  return User.findOne({username: req.user.username})
    .populate({path: 'courses', select: 'courseId studentsSetTeams teamsMustBeInSameLab'})
    .exec()
    .then((user: any) => {
      return user.courses;
    });
}

/**
 * Determine if a username is a 'staff' or 'admin' member in a Course.
 * @param payload.username string ie. 'steca' or 'x3b3c'
 * @param payload.courseId string ie. '310' to check for staff members in Course object
 * @return boolean true if a staff, false otherwise
 */
function isStaffOrAdmin(payload: any): Promise<boolean> {
  let course: ICourseDocument;
  let user: IUserDocument;

  return Course.findOne({courseId: payload.courseId})
    .then((_course: ICourseDocument) => {
      if (_course) {
        course = _course;
        return course;
      }
      throw `Could not find course ${payload.courseId}`;
    })
    .then(() => {
      return User.findOne({username: payload.username})
        .then((_user: IUserDocument) => {
          if (_user) {
            user = _user;
            return true;
          } 
          return false;
        });
    })
    .then((isValidUser: boolean) => {
      let isStaffOrAdmin: boolean;
      if (typeof user !== 'undefined') {
        isStaffOrAdmin = course.staffList.indexOf(user._id) > -1 || course.admins.indexOf(user._id) > -1 ? true : false;
      }
      if (isStaffOrAdmin && isValidUser) {
        return true;
      } 
      return false;
    });
}

function create(course: ICourseDocument) {
  logger.info('create() in Courses Controller');
  let query = Course.findOne({'courseId': course.courseId}).exec();

  return query.then(result => {
    if (result === null) {
      return Course.create(course);
    } else {
      return Promise.reject(Error('Course ' + course.courseId + ' already exists'));
    }
  });
}

function getCourse(payload: any) {
  logger.info(`CourseController::getCourse(${payload.courseId}`);
  return Course.findOne({'courseId': payload.courseId})
    .select('-labSections -classList -grades')
    .exec();
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
  return Course.findOne({courseId: req.params.courseId})
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

export {
  getAllCourses, create, update, remove, updateClassList, getClassList, getStudentNamesFromCourse,
  getAllAdmins, getMyCourses, getCourseSettings, getLabSectionsFromCourse,
  getCourseLabSectionList, getCourse, isStaffOrAdmin, addAdminList, addStaffList, getAllStaff
};
