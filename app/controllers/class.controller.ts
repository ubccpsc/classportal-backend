import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { Course, ICourseDocument } from '../models/course.model';
import { User, IUserDocument } from '../models/user.model';
import { logger } from '../../utils/logger';

/**
 * Update a class list
 * Input: CSV
 */

function update(classList: any, courseId: string) {
  console.log('entered');
  console.log(classList);
  console.log('class list: ' + classList.path);
  console.log('courseID: ' + courseId);

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

  return Course.find({ 'courseId': courseId });
}

function read(courseId: string) {
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

export { update, read }
