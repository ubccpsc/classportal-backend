import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { Grade, IGradeDocument } from '../models/grade.model';
import { Course, ICourseDocument } from '../models/course.model';
import { Deliverable, IDeliverableDocument } from '../models/deliverable.model';
import { User, IUserDocument } from '../models/user.model';

let payload: any;

function updateCourseGrades(courseId: string) {
  logger.info('upgradeCourseGrades() in Grades Controller');

  return Course.findOne({ 'courseId': courseId }).populate('classList deliverables')
    .exec()
    .then(course => {
      if (course) {
        getDeliverables(course);
      }
      return Error('No course found');
    })
    .then( c => {
      return c;
    });
}

// 2) Take deliverable names and courseId to get Deliverable Objects List

function getDeliverables(course: ICourseDocument) {
  let deliverables = new Array();
  console.log('eh + ' + course.deliverables);
  for ( let i = 0; i < course.deliverables.length; i++ ) {
    console.log(course.deliverables[i]);
  }
  return Course.find( { 'courseId' : 555 } );
}

// 1) Query course
function getCourse(courseId: string) {
  return Course.findOne( { 'courseId' : courseId })
    .populate('deliverables classList')
    .exec()
    .then( course => {
      getDeliverables(course);
    })
    .catch( err => {
      logger.info('Error in createOrUpdateGrades() ' + err);
    });
}

function createOrUpdateGrades(grades: [any], courseId: string) {

  let updatedGrades = new Array();





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


  // return COURSE;
}


  // Promise.all([COURSE, loop]).then(updateGrades);
let promiseA = function (test: string) {
  console.log('promise 1 ' + test);
  return test;
};

let promiseB = function (test2: string) {
  return Promise.resolve('promise 2 ' + test2);
};

let promiseC = function (test3: string) {
  console.log('promise 3 ' + test3);
  return Promise.resolve(console.log('done'));
};

function create(payload: any) {
  logger.info('create() in Grades Controller');
  // payload = payload;
  updateCourseGrades(payload.courseId);
  return Course.find( {} );
  // console.log(payload);
  // return createOrUpdateGrades(payload.grades, payload.courseId);
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
