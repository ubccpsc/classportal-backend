import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { Course, ICourseDocument } from '../models/course.model';
import { Deliverable, IDeliverableDocument } from '../models/deliverable.model';
import { User, IUserDocument } from '../models/user.model';
import { Grade, IGradeDocument } from '../models/grade.model';
import * as parse from 'csv-parse';

let fs = require('fs');
let stringify = require('csv-stringify');

// Promisify csv-stringify
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

// Promisify csv-parse
let csvParser = function(filePath: string, options: any) {
  return new Promise((resolve, reject) => {
    console.log(filePath);
    console.log(options);
    let parser = parse(options, (err: Error, data: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
    fs.createReadStream(filePath).pipe(parser);
  });
};

function addGradesCSV(req: any) {
  const options = {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  };

  csvParser(req.files.grades.path, options).then( (result) => {
    console.log('anything');
    console.log(result);
  })
  .catch(err => { logger.info(err); });

  let parser = parse(options, (err, data) => {
    console.log(err);
    let lastCourseNum = null;
    let course = null;
    let newClassList = new Array();
    let usersRepo = User;


    for (let key in data) {
      let student = data[key];
      console.log(student);
    }
  });

  return Grade.find({}).exec();
}

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
          let isInArray: boolean;
          if (c !== null) {
            isInArray = c.grades.some( function(grade: IGradeDocument) {
              return grade._id !== newGrades[key]._id;
            });
          }
          if (c !== null && !isInArray) {
            c.grades.push(newGrades[key]);
          }
          return c.save();
        });
      }
      return c.save();
    });
  };

  let findOrCreateGrades = Promise.all(payload.grades.map( (g: IGradeDocument) => {
    return Grade.createOrUpdate(g)
      .then( newOrUpdatedGrade => {
        return newOrUpdatedGrade;
      });
  }))
  .then( (newGrades) => {
    addGradesToCourse(newGrades);
  });

  return findOrCreateGrades;
}

function getAllGradesByCourse(req: any) {
  logger.info('getAllGradesByCourse()');
  let courseQuery = Course.findOne({ courseId : req.params.courseId })
  .populate({
    path: 'grades',
    model: 'Grade',
    select: '-__v -_id',
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


export { update, getAllGradesByCourse, getReleasedGradesByCourse, create, addGradesCSV }
