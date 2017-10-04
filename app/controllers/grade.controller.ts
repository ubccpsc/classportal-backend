import * as restify from 'restify';
import {logger} from '../../utils/logger';
import {Course, ICourseDocument} from '../models/course.model';
import {Deliverable, IDeliverableDocument} from '../models/deliverable.model';
import {User, IUserDocument} from '../models/user.model';
import {Grade, IGradeDocument} from '../models/grade.model';
import {config} from '../../config/env';
import db, {Database} from '../db/MongoDbClient';
import * as parse from 'csv-parse';
import mongodb = require('mongodb');

let context: Database = db;

let MongoClient = mongodb.MongoClient;

let fs = require('fs');
let stringify = require('csv-stringify');

// Promisify csv-stringify
let csvGenerate = function (input: any) {
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
let csvParser = function (filePath: string, options: any) {
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

// addGradesCSV()
// Steps:
// 1) Queries Deliverable with _id in Req to retrieve Deliverable._id
// 2) Takes CSV in Request and turns it into Array
// 3) Iterates over array and adds each Grade to the DB linked with the Deliverable._id
function addGradesCSV(req: any) {

  let delivName: string;

  // CSV parser options
  const options = {
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
  };

  let deliverableQuery = Deliverable.findOne(({_id: req.params.delivId}))
    .exec()
    .then(d => {
      if (d === null) {
        return Promise.reject('Cannot find Deliverable ID ' + req.params.delivId + '.');
      }
      return Promise.resolve(delivName = d.name);
    });

  // Updates grade if exists, creates grade if does not exist.
  csvParser(req.files.grades.path, options).then((result: any) => {
    for (let i = 0; i < result.length; i++) {
      Grade.findOne({snum: result[i].snum})
        .then(g => {
          if (g !== null) {
            g.details = {finalGrade: result[i].grade};
            return g.save();
          } else {
            return Grade.create({
              snum:    result[i].snum,
              deliv:   delivName,
              delivId: req.params.delivId,
              details: {finalGrade: result[i].grade},
            });
          }
        });
    }
    return Promise.reject(Error('Error reading grades. Please check that grades exist in CSV'));
  })
    .catch(err => {
      logger.info(err);
    });

  return Grade.find({}).exec();
}

function create(payload: any) {
  logger.info('create() in Grades Controller');
  let gradesArray = new Array();
  let getCourse = Course.findOne({courseId: payload.courseId}).populate('grades classList').exec();

  // Adds Grades to Course object if they do not exist without deleting previous array contents.
  let addGradesToCourse = function (newGrades: [any]) {
    return getCourse.then(c => {
      return c;
    })
      .then(c => {
        for (let key in newGrades) {
          Course.findOne({'courseId': payload.courseId}).populate({
            path:  'courses classList',
            match: {_id: newGrades[key]._id},
          })
            .exec()
            .then(c => {
              let isInArray: boolean;
              if (c !== null) {
                isInArray = c.grades.some(function (grade: IGradeDocument) {
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

  let findOrCreateGrades = Promise.all(payload.grades.map((g: IGradeDocument) => {
    return Grade.createOrUpdate(g)
      .then(newOrUpdatedGrade => {
        return newOrUpdatedGrade;
      });
  }))
    .then((newGrades) => {
      addGradesToCourse(newGrades);
    });

  return findOrCreateGrades;
}

function getAllGradesByCourse(req: any) {
  logger.info('getAllGradesByCourse()');
  let courseQuery = Course.findOne({courseId: req.params.courseId})
    .populate({
      path:   'grades',
      model:  'Grade',
      select: '-__v -_id',
    }).exec();

  if (req.query !== null && req.query.format == 'csv') {
    return courseQuery.then(course => {
      let response: any;
      let stringify = require('csv-stringify');
      let arrayOfGradesResponse = new Array();
      let csvColumns = ['snum', 'grade'];

      arrayOfGradesResponse.push(csvColumns);

      for (let i = 0; i < course.grades.length; i++) {
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
  let gradesInCourse = Course.findOne({'courseId': req.params.courseId}).populate('grades').exec();

  let getReleasedDeliverables = Deliverable.find({gradesReleased: true})
    .exec()
    .then(deliverables => {
      let deliverableNames = new Array();
      for (let key in deliverables) {
        if (deliverables[key].gradesReleased === true) {
          deliverableNames.push(deliverables[key].name);
        }
      }
      return deliverableNames;
    })
    .catch(err => logger.info(err));

  return getReleasedDeliverables.then((deliverableNames: IDeliverableDocument[]) => {
    let snum = req.user.snum;
    return Grade.find({
      'snum':  snum,
      'deliv': {$in: deliverableNames},
    }).exec();
  });
}

/**
 * 
 * @param courseId courseId number of courseId ie. 310
 * @param deliverableName string name of deliverable ie. 'd2'
 */
function getGradesFromResults(payload: any) {

  // 7 hour time difference in production
  const UNIX_TIMESTAMP_DIFFERENCE = 25200000;

  console.log(payload);

  let course: ICourseDocument;
  let deliverable: IDeliverableDocument;
  let deliverableNames: string[];

  return Course.findOne({courseId: payload.courseId})
    .then((_course) => {
      if (_course) {
        course = _course;
        return _course;
      }
      throw `Could not find Course ${payload.courseId}`;
    })
    .then(() => {
      return Deliverable.findOne({name: payload.deliverableName, courseId: course._id})
        .then((_deliv: IDeliverableDocument) => {
          if (_deliv) {
            deliverable = _deliv;
            return _deliv;
          }
          throw `Could not find deliverable under ${payload.deliverableName} and ${course.courseId}`;
        });
    })
    .then(() => {
      return db.getUniqueStringsInRow('results', {orgName: 'CPSC210-2017W-T1'}, 'deliverable')
        .then((_deliverableNames: string[]) => {
          console.log(_deliverableNames);
          if (_deliverableNames) {
            deliverableNames = _deliverableNames;
            return _deliverableNames;
          }
          throw `No deliverable names found in ${payload.orgName}`;
        })
        .catch(err => {
          logger.error(`GradeController::getGradesFromResults() getUniqueStringsInRow ERROR ${err}`);
        });
    })
    .then(() => {
      let timestamp: number = new Date(deliverable.close.toString()).getTime();        
      console.log(timestamp);
      return db.getLatestResultRecords('results', timestamp, {
        orgName: 'CPSC210-2017W-T1',
        deliverable: payload.deliverableName,
        timestamp: {'$lte' : timestamp}
      })
      .then((result: any[]) => {
        return result;
      });
    });
}

export {getAllGradesByCourse, getReleasedGradesByCourse, create, addGradesCSV, getGradesFromResults};
