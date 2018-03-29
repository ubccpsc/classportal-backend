/**
 * FUTURE COMPATIBILITY OF COURSES:
 * 
 * IMPORTANT: Courses have been created as strings. While validation demands a number between 3-4 chars long,
 * if growth in Courses leads to multiple Courses with different Github Organizations on Github, then you 
 * may change the validation to include letters as appendages, such as ie. '310a', '310b', etc.
 * 
 * This change will require some minor mondifications in AutoTest.
 * 
 * A different Github Organization can be specified in a different Course object to create seperate namespaces
 * and Course sections for different sets of students.
 */

import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import {ICourseDocument, Course, CourseInterface, LabSection, StudentWithLab} from '../models/course.model';
import {IUserDocument, User, CourseData} from '../models/user.model';
import {logger} from '../../utils/logger';
import {config} from '../../config/env';
import {log} from 'util';
import {ENOLCK} from 'constants';
import {DockerLogs} from './docker.controller';
import {isAdmin, superAuth} from '../middleware/auth.middleware';

enum ValidationModes {
  UPDATE,
  CREATE
}

/**
 * Gets a list of users who are Admins underneath a particular course
 * @param payload.courseId string ie. '310'
 * @return User[] A list of admins
 */
function getCourseAdmins(payload: any) {
  return Course.findOne({courseId: payload.courseId})
    .populate({path: 'admins'})
    .then(c => {
      return c.admins;
    });
}

/**
 * Gets a list of users who are Staff underneath a particular course
 * @param payload.courseId string ie. '310'
 * @return IUserDocument[] A list of staff
 */
function getCourseStaff(payload: any) {
  return Course.findOne({courseId: payload.courseId})
    .populate({path: 'staffList'})
    .then(c => {
      return c.staffList;
    });
}

/**
 * INFO: Adds Admins in from CSV to Course.admin[] to give them Admin priviledges
 * and changes their userrole to 'admin' in the User field.
 * 
 * NOTE - ADMINS CANNOT BE STUDENTS:
 * 
 * Admins cannot be enrolled in Courses at this time due to compatibility issues on
 * views and since they do not have a SNUM. If an Admin gets an SNUM in the future,
 * change the findOrCreate() method to use their unique CSID and SNUM and they can 
 * become students.
 * 
 * Pre-req #1 is that HEADERS in CSV are labelled with headers below:
 *                    HEADERS: CWL (required), FIRST (optional), LAST (optional)
 *         #2 CWL, first, last must match if already exist.
 * 
 * @param req.files as reqFiles with FS readable reqFiles['adminList'].path
 * @param courseId string ie. '310' of the course we are adding labList too
 * @return adminList object
 */
function addAdminList(reqFiles: any, courseId: string): Promise<IUserDocument[]> {
  logger.info('CourseController:: addAdminList() - start');
  return new Promise((fulfill, reject) => {
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
          csid: admin.CWL,
          snum: admin.CWL,
        }).then((u: IUserDocument) => {
          // CSID and SNUM must be unique and exist on User object according to index (so throw in consistent unique value)
          u.userrole = ADMIN_USERROLE;
          u.fname = admin.FIRST;
          u.lname = admin.LAST;
          return u.save();
        }));
      });
  
      courseQuery.then((course: ICourseDocument) => {
        let userIds: IUserDocument[] = [];
  
        return Promise.all(userQueries)
          .then((results: any) => {
            course.admins = [];
            Object.keys(results).forEach((key) => {
              if (course.admins.indexOf(results[key]._id as IUserDocument) === -1) {
                course.admins.push(results[key]._id as IUserDocument);
              }
            });
            course.save()
              .then((course: ICourseDocument) => {
                fulfill(course);
              });
          });
      });
  
      if (err) {
        reject(err);
        err;
      }
    });
  
    rs.pipe(parser);  
  })
  .then((c: ICourseDocument) => {
    return Course.findOne({courseId: c.courseId})
      .populate('admins')
      .then((course: ICourseDocument) => {
        return course.admins;
      });
  });
}

/**
 * Upload a staffList
 * Staff will be created in Users database as 'student' because there is always
 * the chance that they are registered in another Course. Hence, their CSID and SNUM 
 * must always be included in case of this possibility.
 * 
 * Pre-req #1 is that HEADERS in CSV are labelled with headers below:
 *                    REQUIRED: CWL / CSID / SNUM / FNAME / LNAME
 * 
 * ** WARNING ** Uploading a staffList will overwrite the previous labList 
 * in the Course object.
 * 
 * @param req.files as reqFiles with FS readable reqFiles['staffList'].path
 * @param courseId string ie. '310' of the course we are adding staffList too
 * @return staffList object
 */
function addStaffList(reqFiles: any, courseId: string): Promise<IUserDocument[]> {
  const options = {
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
  };

  let rs = fs.createReadStream(reqFiles['staffList'].path);
  let courseQuery = Course.findOne({'courseId': courseId}).exec();
  return new Promise((fulfill, reject) => {
    let parser = parse(options, (err, data) => {

      let userQueries: any = [];
  
      Object.keys(data).forEach((key: string) => {
        let staff = data[key];
        let course: ICourseDocument;
        logger.info('CourseController:: addStaffList() Creating staff in Users if user does not already ' +
           'exist for CSV line: ' + JSON.stringify(staff));
        userQueries.push(User.findOne({
          username: staff.CWL,
          csid: staff.CSID,
          snum: staff.SNUM
        }).then((u: IUserDocument) => {
          if (u) {
            u.fname = staff.FIRST;
            u.lname = staff.LAST;
            // Still a student. Staff role comes from objectId in Course.staffList[] property
            u.userrole = 'student';
            return u.save();
          } else {
            return User.create({
              username: staff.CWL,
              csid: staff.CSID,
              snum: staff.SNUM,
              fname: staff.FIRST,
              lname: staff.LAST
            })
              .then((u: IUserDocument) => {
                return u;
              });
          }

        }).catch((err: any) => {
          logger.error('CourseController::addStaffList() ERROR ' + err);
          reject('CourseController::addStaffList() ERROR ' + err + ' STAFF: ' + JSON.stringify(staff));
        }));
      });
  
      courseQuery.then((course: ICourseDocument) => {
        let userIds: IUserDocument[] = [];
  
        return Promise.all(userQueries)
          .then((results: any) => {
            course.staffList = [];
            Object.keys(results).forEach((key) => {
              if (course.staffList.indexOf(results[key]._id as IUserDocument) === -1) {
                course.staffList.push(results[key]._id as IUserDocument);
              }
            });
  
            fulfill(course.save());
          });

      });
  
      if (err) {
        reject(err);
      }
    });
  
    rs.pipe(parser);
  })
  .then(() => {
    return Course.findOne({courseId})
    .populate({path: 'staffList'})
    .exec()
    .then((course: ICourseDocument) => {
      return course.staffList;
    });
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
 * ** SUPER IMPORTANT ** Team creation requires that students are seen as in the same lab
 * or not. Instead of writing two sets of code, we add students who are not in a lab as the "NOLAB" 
 * section. As "NOLAB" is a string like any other lab string, and "NOLAB" is added to users
 * without a lab by default, "NOLAB" is considered as the same lab. Therefore, these students can enter
 * a team from within the same lab.
 * 
 * If students are in different Class Sections and are not in a Lab, substitute the Lab Section with a 
 * Section ID/Number when performing the classList update. They will then be able to join teams from 
 * within their own Class Sections.
 * 
 * @param req.files as reqFiles with FS readable reqFiles['classList'].path
 * @param courseId string ie. '310' of the course we are adding classList too
 * @return classList object
 */
function updateClassList(reqFiles: any, courseId: string): Promise<StudentWithLab[]> {
  const NO_LAB_SECTION = 'NOLAB';
  const GITHUB_ENTERPRISE_URL = config.github_enterprise_url;
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
        if (typeof student.LAB === 'undefined' || student.LAB === '') {
          student.LAB = NO_LAB_SECTION; // Added to users with no lab section for Team selection feature
        }
  
        logger.info('Parsing student into user model: ' + JSON.stringify(student));
        userQueries.push(User.findOne({
          username: student.CWL,
          csid: student.CSID,
          snum: student.SNUM
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
            })
            .catch((err) => {
              logger.error('CourseController:: findOrCreate() ERROR: ' + err + ' STUDENT: ' + JSON.stringify(student));
              if (err) {
                reject ('CourseController:: findOrCreate() ERROR: ' + err + ' STUDENT: ' + JSON.stringify(student));
              }
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
            course.labSections = createLabList(data, results);

            return course.save()
              .then(() => {
                return Course.findOne({courseId})
                  .populate({path: 'labSections.users classList'})
                  .then((updatedCourse: ICourseDocument) => {
                    let studentsWithLab: StudentWithLab[] = addLabSectionToClassList(updatedCourse.classList as IUserDocument[], updatedCourse.labSections);
                    fulfill(studentsWithLab);
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
 * @param data raw parsed data object from the updateClassList() read stream;
 * @param results IUserDocument list of student objects that have been queried or created on 
 * the basis of the uploaded classList file in updateClassList()
 * @return labSections LabSection[] Course.labSections property that contains labSections info
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
                ', ' + dbStudent.csid + ', ' + dbStudent.fname + ', ' + dbStudent.lname + ' to Lab Section ' 
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
 * Retrieves a StudentWithLab[] list for the front-end
 * 
 * @param courseId string ie. '310'
 * @return StudentWithLab[] class list of users in course
 */
function getClassList(courseId: string): Promise<StudentWithLab[]> {
  let that = this;
  return Course.findOne({'courseId': courseId})
    .populate({
      path: 'classList labSections.users',
    })
    .exec()
    .then(course => {
      if (!course) {
        // if course does not exist, return null
        return null;
      } else {
        let classListWithLabSections = addLabSectionToClassList(course.classList as IUserDocument[], course.labSections);
        return classListWithLabSections;
      }
    });
}

function addLabSectionToClassList(classList: IUserDocument[], labSections: LabSection[]): StudentWithLab[] {

  let studentsWithLab: StudentWithLab[] = [];

  // Map the lab section to the Student to create a ClassList object
  classList.map((clUser: IUserDocument) => {
    
    let inLab: boolean = false;
    let labId: string;

    // First create the studentWithLab type without Labs, as this is still returned for a class list even if
    // the students in a course do not have labs.

    if (labSections.length > 0) {
      labSections.map((labSection: LabSection) => {
        labSection.users.map((user) => {
          if (String(user._id).indexOf(clUser._id) > -1) {
            inLab = true;
            labId = labSection.labId;
          }
        });
      });
    }

    if (inLab) {
      let studentWithLab: StudentWithLab = {
        fname: clUser.fname,
        lname: clUser.lname,
        labSection: labId,
        csid: clUser.csid,
        snum: clUser.snum
      };
      studentsWithLab.push(studentWithLab);
    } else {
      let studentWithLab: StudentWithLab = {
        fname: clUser.fname,
        lname: clUser.lname,
        labSection: undefined,
        csid: clUser.csid,
        snum: clUser.snum
      };
      studentsWithLab.push(studentWithLab);
    }
  });
  return studentsWithLab;
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
  let query = Course.find({})
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

/**
 * Updates a Course Object from the SuperAdmin view.
 * 
 * NOTE: Not all properties in Course object are updated, as other endpoints handle
 * their logic.
 * 
 * @param course Course Interface object from CoursePayload front-end
 * @return ICourseDocument on successful creation || string on error.
 */
async function updateCourse(coursePayload: CourseInterface): Promise<ICourseDocument> {
  logger.info('CourseController::updateCourse() in Courses Controller');
  let isValid: boolean = await validateCourse(coursePayload, ValidationModes.UPDATE);

  if (isValid) {
    return Course.findOne({courseId: coursePayload.courseId})
      .then((course: ICourseDocument) => {
        if (course) {
          // IMPORTANT: Never want to update courseId, as that would result in catastrophe.
          course.dockerRepo = coursePayload.dockerRepo;
          course.dockerKey = coursePayload.dockerKey;
          course.urlWebhook = coursePayload.urlWebhook;
          if (superAuth) {
            course.githubOrg = coursePayload.githubOrg;
          }
          // NOTE: Never want UI to update DockerLogs, buildingContainer. Purely back-end logic.
          return course.save()
            .then((course: ICourseDocument) => {
              return course;
            });
        } 
        throw `Could not find Course. updateCourse() expects that a Course already exists.`;
      })
      .then((course: ICourseDocument) => {
        return course;
      });
  } else {
    throw `Course is invalid. Cannot update Course`;
  }
}

/**
 * Creates a Course object with the validation of a CoursePayload from
 * the UI.
 * 
 * @param course Course Interface object from CoursePayload front-end
 * @return ICourseDocument on successful creation || string on error.
 */
async function createCourse(coursePayload: CourseInterface): Promise<ICourseDocument> {
  logger.info('CourseController::createCourse() in Courses Controller');
  let isValid: boolean = await validateCourse(coursePayload, ValidationModes.CREATE);

  if (isValid) {
    coursePayload.urlWebhook = config.app_path + ':1' + coursePayload.courseId + '/submit';
    return Course.create(coursePayload)
      .then((course) => {
        if (course) {
          return course;
        }
        throw `Could not create Course object from ${JSON.stringify(coursePayload)}`;
      });
  } else {
    return Promise.reject('Course did not pass validation.');
  }
}

/** 
 * Validates a CoursePayload from the UI.
 * 
 * @param payload.course CoursePayload object that fits Course interface from 
 * @param updateMode Use 'ValidationModes' enumerated string in this CourseController.ts
 * @return Promise<Boolean> true if valid, false if invalid.
*/
async function validateCourse(course: CourseInterface, mode: ValidationModes): Promise<boolean> {
  logger.info('CourseController::validateCourse() in Courses Controller');
  
  const HTTPS_REGEX = new RegExp(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
  const ORG_REGEX: RegExp = new RegExp('^([A-Z0-9{4}]+-)([A-Z0-9{4}]+-)([A-Z0-9{4}])*$');
  const DNS_PORT_REGEX: RegExp = new RegExp(/^([^\:]+:[0-9]+\s|[0-9]+.[0-9]+.[0-9]+.[0-9]+:[0-9]\+)+$/g);
  const COURSE_ID_REGEX: RegExp = new RegExp('(^[0-9]{3,4}$)');

  if (mode === ValidationModes.CREATE) {
    // CREATE COURSE VALIDATION REQUIRED: 
    // If Course exists already, reject.
    let courseExists = await Course.findOne({courseId: course.courseId})
      .then((course: ICourseDocument) => {
        if (course) {
          logger.info('CourseController::validateCourse() FAILED #1: Course ' + course.courseId + ' already exists');
          return true;
        } 
        return false;
      });

    if (courseExists) {
      return Promise.resolve(false);
    }

    // Ensure that Course Id is string of numbers between 3-4 chars in length
    if (!COURSE_ID_REGEX.test(course.courseId)) {
      logger.info('CourseController::validateCourse() FAILED #6: Course Id is string of numbers between 3-4 chars in length.');
      return Promise.resolve(false);
    }
  } else if (mode === ValidationModes.UPDATE) {
    // UPDATING A COURSE VALIDATION REQUIRED:
  } else {
    // BOTH: UPDATING AND NEW COURSE VALIDATION REQUIRED:
    // If dockerRepo string not blank, make sure it is https format
    if (course.dockerRepo === '' || HTTPS_REGEX.test(course.dockerRepo)) {
      // do nothing if it matches
    } else {
      logger.info('CourseController::validateCourse() FAILED #2: `dockerRepo` string not blank, make sure it is https format');
      return Promise.resolve(false);
    }

    // If github org does not match convention ie. 'CPSC210-2017W-T2', then reject
    if (!ORG_REGEX.test(course.githubOrg)) {
      logger.info('CourseController::validateCourse() FAILED #3: `githubOrg` does not match convention ie. "CPSC210-2017W-T2"');
      return Promise.resolve(false);
    }

    // Ensure that URL webhook is HTTPS proper format.
    if (!HTTPS_REGEX.test(course.urlWebhook)) {
      logger.info('CourseController::validateCourse() FAILED #5: Ensure that URL webhook is HTTPS proper format.');
      return Promise.resolve(false);
    }
  }

  logger.info('CourseController::validateCourse SUCCESS: Course ' + course.courseId + ' passed validation');
  return Promise.resolve(true);
}

/**
 * IF student role, returns course Ids that student is registered in
 * IF admin role, returns course Ids that admin is admin in
 * IF superadmin role, returns all course Ids
 * @param payload.courseIds 
 * @return string[] courseIDs ie. ['310', '210'];
 */
function getCourseIds(payload: any, req: any): Promise<string[]> {
  let courseIds: string[] = [];
  return Course.find({})
    .populate('admins staffList')
    .then((courses: ICourseDocument[]) => {
      if (courses) {
        courses.map((course) => {
          // Pushes the courseId if the user is an admin or staff in that course for privacy
          // and eliminates lots of other logic debugging for other views.
          if (typeof req.user.username !== 'undefined' && req.user.userrole === 'student') {
            if (course.staffList.indexOf(req.user._id) > -1) {
              courseIds.push(course.courseId);
            }
            if (course.classList.indexOf(req.user._id) > -1) {
              if (courseIds.indexOf(req.user._id) === -1) {
                courseIds.push(course.courseId);
              }
            }
          }
          if (typeof req.user.userrole !== 'undefined' && req.user.userrole === 'admin') {
            course.admins.map((user) => {
              if (user.username === req.user.username) {
                courseIds.push(course.courseId);
              }
            });
          }
          if (typeof req.user.username !== 'undefined' && req.user.userrole === 'superadmin') {
            courseIds.push(course.courseId);
          }
        });
      }
      return courseIds;
    });
}

/**
 * @param payload.courseId course id string to get course for ie. '310'
 * @return ICourseDocument course that is requested.
 */
function getCourse(payload: any): Promise<ICourseDocument> {
  return Course.findOne({courseId: payload.courseId})
    .then((course: ICourseDocument) => {
      if (course) {
        return course;
      }
      throw `Could not find Course ${payload.courseId}`;
    });
}


export {
  getAllCourses, createCourse, updateClassList, getClassList, getStudentNamesFromCourse,
  getCourseAdmins, getLabSectionsFromCourse, getCourseIds, getCourseLabSectionList,
  isStaffOrAdmin, addAdminList, addStaffList, getCourseStaff, updateCourse, getCourse,
};
