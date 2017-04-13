import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { Grade, IGradeDocument } from '../models/grade.model';
import { Course, ICourseDocument } from '../models/course.model';
import { Deliverable, IDeliverableDocument } from '../models/deliverable.model';
import { User, IUserDocument } from '../models/user.model';



function updateCourseGrades(courseId: string) {
  logger.info('upgradeCourseGrades() in Grades Controller');

  let courseQuery = Course.findOne({ 'courseId': courseId })
    .then(course => {
      if (course) {
        return course;
      } else {
        return Error('Course does not exist');
      }
    });
}

// 2) Take deliverable names and courseId to get Deliverable Objects List

function getDeliverables(course: ICourseDocument) {
  return Promise.resolve(course.deliverables);
}

function createOrUpdateGrades(grades: [any], courseId: string) {

  let updatedGrades = new Array();


  // 1) Query course
  return Course.findOne( { 'courseId' : courseId })
    .populate('deliverables classList')
    .exec()
    .then( course => {
      return getDeliverables(course);
    })
    .catch( err => {
    	logger.info('Error in createOrUpdateGrades()');
    });


  // let loop = function() {
  //   for (let key in grades) {
  //     let newGrade = Object();

  //     let assignCourseIdToGrade = Promise.resolve(COURSE.then(c => {
  //       logger.info('assignCourseIdToGrade() in Grades Controller');
  //       newGrade.courseId = c.courseId;
  //       return c;
  //     }));

  //     let assignDeliverableToGrade = Deliverable.findOne( { 'name' : grades[key].deliverable }).exec()
  //     .then( d => {
  //       logger.info('assignDeliverableToGrade in Grades Controller');
  //       newGrade.deliverableId = d._id;
  //       return d;
  //     });

  //     let pushNewGrade = Promise.resolve(updatedGrades.push(newGrade));

  //     Promise.all([assignCourseIdToGrade, assignDeliverableToGrade, pushNewGrade]);
  //     console.log(newGrade);
  //     console.log(JSON.stringify(updatedGrades));
  //   }

  //   return Promise.resolve(updatedGrades);
  // };


  // let updateGrades = function() {
  //   for ( let key in updatedGrades ) {
  //     Grade.create(updatedGrades[key]);
  //   }
  // };


  // Promise.all([COURSE, loop]).then(updateGrades);


  // return COURSE;
}

function create(payload: any) {
  logger.info('create() in Grades Controller');
  return createOrUpdateGrades(payload.grades, payload.courseId);
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
