import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { Course, ICourseDocument } from '../models/course.model';
import { Deliverable, IDeliverableDocument } from '../models/deliverable.model';
import { User, IUserDocument } from '../models/user.model';
import { Grade, IGradeDocument } from '../models/grade.model';

function create(payload: any) {
  logger.info('create() in Grades Controller');
  let course: ICourseDocument;
  let gradesArray = new Array();
  let getCourse = Course.findOne({ courseId : payload.courseId }).populate('courses').exec();

  let addGradesToCourse = function(newGrades: [Object]) {
    return getCourse.then( c => {
      return c;
    })
    .then( c => {
      console.log('one' + c);
      console.log('two' + newGrades);

      for (let i = 0; i < newGrades.length; i++) {
        let isInArray = c.grades.some( function(grade: IGradeDocument) {
          console.log(c.grades[i] === grade._id);
          console.log(c.grades[i]);
          newGrades[i] === grade._id ? c.grades.push(grade) : null;
          return c.grades[i] === grade._id;
        });
      }
    });
  };

  let findOrCreateGrades = Promise.all(payload.grades.map( (g: IGradeDocument) => {
    return Grade.createOrUpdate(g)
      .then( newOrUpdatedGrade => {
        return newOrUpdatedGrade;
      })
      .catch(err => logger.info(err));
  }))
  .then( (newGrades) => {
    console.log(newGrades);
    addGradesToCourse(newGrades);
  })
  .catch(err => logger.info(err));
  return Course.findOne({ courseId : 710 });
}

function read(payload: any) {
  logger.info('get grades');
  console.log(payload.grades);
  return Promise.resolve('hello');
}

function update(req: restify.Request, res: restify.Response, next: restify.Next) {
  logger.info('update grades');
  res.json(200, 'update grades');
  return next();
}

export { update, read, create }
