import * as restify from 'restify';
import {logger} from '../../utils/logger';
import {Course, ICourseDocument} from '../models/course.model';
import {Team, ITeamDocument} from '../models/team.model';
import {Deliverable, IDeliverableDocument} from '../models/deliverable.model';
import {User, IUserDocument} from '../models/user.model';
import {Grade, IGradeDocument} from '../models/grade.model';
import {config} from '../../config/env';
import {GradePayloadContainer, GradeRow, GradeDetail} from '../interfaces/ui/grade.interface';
import {ResultRecord, ResultPayload, ResultPayloadContainer,
  ResultDetail, Student} from '../interfaces/ui/result.interface';
import db, {Database} from '../db/MongoDBClient';
import * as parse from 'csv-parse';
import mongodb = require('mongodb');

let context: Database = db;
let MongoClient = mongodb.MongoClient;
let fs = require('fs');
let stringify = require('csv-stringify');

/**
 *
 *
 * BEGIN New grade payload interfaces.
 *
 *
 */
export interface GradePayload {
  grades: StudentGrade[];
}

export interface StudentGrade {
  studentNumber: number;
  cwl: string;
  lab: string;
  deliverables: DeliverableGrade[];
}

/**
 * Note: there can be multiple entries in this array for the same delivId
 * (e.g., if you want to emit all entries for a deliverable).
 *
 * For V1, only emit name: ( FINAL | MAX )
 */
export interface DeliverableGrade {
  delivId: string;
  name: string; // 'FINAL' (last grade before deadline), 'MAX' (max grade), 'RUN' (any intermediate run)
  projectUrl: string;
  timestamp: number; // new Date().getTime()
  overall: number; // this is the final grade
  components: GradeComponent[];
}

/**
 * This seems overly flexible, but in subsequent terms the containers will be able to emit any
 * set of key/value pairs they want here and have them rendered in the UI.
 */
export interface GradeComponent {
  key: string; // e.g., 'cover', 'test'
  value: number | string; // will usually be a number, but might be some kind of string-based feedback.
}


/**
 *
 *
 * END new grade payload interfaces.
 *
 *
 */


/**
 * Legacy grade payload interfaces
 */

export interface FinalGrade {
  finalGrade: number;
  deliverableWeight: string;
}

export interface StudentInfo {
  projectUrl: string;
  projectCommit: string;
}

export interface CustomGrade210 {
  coverageGrade: number;
  testingGrade: number;
  coverageWeight: number;
  testingWeight: number;
  coverageMethodWeight: number;
  coverageLineWeight: number;
  coverageBranchWeight: number;
}

export interface CustomGrade310 {
  passPercent: number;
  passCount: number;
  failCount: number;
  skipCount: number;
  passNames: string[];
  failNames: string[];
  skipNames: string[];
}

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
      logger.info('getAllGradesByCourse() - returning csv');
      return csvGenerate(arrayOfGradesResponse);
    });
  }
  logger.info('getAllGradesByCourse() - returning json');
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

function sortArrayByLastName(csvArray: any[]) {
  const LAST_NAME_COLUMN = 2;
  // sort alphabetically by last name
  csvArray.sort((a: any, b: any) => {
    let first = String(a[LAST_NAME_COLUMN]).toUpperCase();
    let second = String(b[LAST_NAME_COLUMN]).toUpperCase();
    if (first < second) {
      return -1;
    }
    if (first > second) {
      return 1;
    }
    return 0;
  });
  return csvArray;
}

export {getAllGradesByCourse, getReleasedGradesByCourse, create, addGradesCSV};
