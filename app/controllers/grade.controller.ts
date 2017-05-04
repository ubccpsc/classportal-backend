import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { Course, ICourseDocument } from '../models/course.model';
import { Deliverable, IDeliverableDocument } from '../models/deliverable.model';
import { User, IUserDocument } from '../models/user.model';
import { Grade, IGradeDocument } from '../models/grade.model';

let stringify = require('csv-stringify');

let csvGenerate = function(input: any) {
  return new Promise((resolve, reject) => {
    stringify(input, (err: Error, csv: string) => {
      if (err) {
        return reject(err);
      } else {
        resolve(csv);
      }
    });
  });
};

function create(payload: any) {
  logger.info('create() in Grades Controller');
  let gradesArray = new Array();
  let getCourse = Course.findOne({ courseId : payload.courseId }).populate('grades classList').exec();

  // Adds Grades to Course object if they do not exist without deleting previous array contents.
  let addGradesToCourse = function(newGrades: [any]) {
    return getCourse.then( c => {
      return c;
    })
    .then( c => {
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
        .catch(err => logger.info(err));
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
    addGradesToCourse(newGrades);
  })
  .catch(err => logger.info(err));
  return Course.findOne({ courseId : payload.courseId }).populate({
    path: 'grades',
    model: 'Grade',
  }).exec();
}

function getAllGradesByCourse(req: any) {
  logger.info('getAllGradesByCourse()');
  let courseQuery = Course.findOne({ courseId : req.params.courseId })
  .populate({
    path: 'grades',
    model: 'Grade',
  }).exec();

  if ( req.query !== null && req.query.format == 'csv') {
    return courseQuery.then( course => {
      let response: any;
      let stringify = require('csv-stringify');
      let arrayOfGradesResponse = new Array();
      let csvColumns = ['snum', 'grade'];

      arrayOfGradesResponse.push(csvColumns);

      for ( let i = 0; i < course.grades.length; i++ ) {
        let g: any = course.grades[i];
        console.log('grade' + JSON.stringify(g));
        let snum = g.snum;
        let grade = g.details.finalGrade;
        arrayOfGradesResponse.push([snum, grade]);
      }

      return csvGenerate(arrayOfGradesResponse);
    });
  }
  return courseQuery;
}

function getReleasedGradesByCourse(req: any) {
  logger.info('getReleasedGradesBycourse()');
  let gradesInCourse = Course.findOne({ 'courseId' : req.params.courseId }).populate('grades').exec();

  let getReleasedDeliverables = Deliverable.find({ gradesReleased: true })
  .exec()
  .then( deliverables => {
    let deliverableNames = new Array();
    for ( let key in deliverables ) {
      if (deliverables[key].gradesReleased === true) {
        deliverableNames.push(deliverables[key].name);
      }
    }
    return deliverableNames;
  })
  .catch(err => logger.info(err));

  return getReleasedDeliverables.then( (deliverableNames: IDeliverableDocument[]) => {
    let snum = req.user.snum;
    return Grade.find({
      'snum' : snum,
      'deliv' : { $in: deliverableNames },
    }).exec();
  });
}

function update(req: restify.Request, res: restify.Response, next: restify.Next) {
  logger.info('update grades');
  res.json(200, 'update grades');
  return next();
}


export { update, getAllGradesByCourse, getReleasedGradesByCourse, create }
