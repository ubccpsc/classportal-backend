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
  let getCourse = Course.findOne({ courseId : payload.courseId }).populate('grades classList').exec();

  let addGradesToCourse = function(newGrades: [any]) {
    return getCourse.then( c => {
      return c;
    })
    .then( c => {
      console.log('one' + c);
      console.log('two' + newGrades);
      for (let key in newGrades) {
        Course.findOne({ 'courseId' : payload.courseId }).populate({
          path: 'courses classList',
          match: { _id : newGrades[key]._id },
        })
        .exec()
        .then( c => {
          let isInArray = c.grades.some( function(grade: IGradeDocument) {
            return grade._id !== newGrades[key]._id;
          });
          if (!isInArray) {
            c.grades.push(newGrades[key]);
          }
          return c.save();
        })
        .then( c => {
          return c.save();
        });
        console.log('this is the new object' + c);
      }
      return c.save();
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
    console.log('1 ' + newGrades);
    addGradesToCourse(newGrades);
  })
  .catch(err => logger.info(err));
  return Course.findOne({ courseId : payload.courseId });
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
