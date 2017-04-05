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
    let newClassList = [Object];
    let usersRepo = User;

    for (let key in data) {
      let student = data[key];
      console.log('each student' + JSON.stringify(student));
      usersRepo.findOrCreate({
        csid : student.CSID,
        snum : student.SNUM,
        lname : student.LAST,
        fname : student.FIRST,
        username : student.USERNAME,
      })
        .catch( (err) => { logger.info('Error creating user in class controller' + err); });
      newClassList.push(student);
    }

    let courseQuery = Course.findOne({ 'courseId': courseId })
      .then( c => {
        c.classList = newClassList;
        c.save();
        return c;
      });


    if (err) {
      throw Error(err);
    }
  });

  rs.pipe(parser);

  return Course.find({ 'courseId': 123 });
}

export { update }
