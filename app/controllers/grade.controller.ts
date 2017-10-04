import * as restify from 'restify';
import {logger} from '../../utils/logger';
import {Course, ICourseDocument} from '../models/course.model';
import {Deliverable, IDeliverableDocument} from '../models/deliverable.model';
import {User, IUserDocument} from '../models/user.model';
import {Grade, IGradeDocument} from '../models/grade.model';
import {config} from '../../config/env';
import db, {Database} from '../db/MongoDBClient';
import * as parse from 'csv-parse';
import mongodb = require('mongodb');

let context: Database = db;
let MongoClient = mongodb.MongoClient;
let fs = require('fs');
let stringify = require('csv-stringify');

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
 * If no deliverableName given, then all deliverable marks returned
 * @param courseId courseId number of courseId ie. 310
 * @param deliverableName string name of deliverable ie. 'd2'
 * @return string CSV formatted report
 */
function getGradesFromResults(payload: any) {

  // 7 hour time difference in production
  const UNIX_TIMESTAMP_DIFFERENCE = 25200000;

  console.log(payload);

  let course: ICourseDocument;
  let deliverables: IDeliverableDocument[];
  let deliverable: IDeliverableDocument;
  let deliverableNames: string[];
  let timestamp: number;
  let singleDelivResults: any[];
  let allDelivResults: any[];

  return Course.findOne({courseId: payload.courseId})
    .populate('classList')
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
      return db.getUniqueStringsInRow('results', {orgName: course.githubOrg}, 'deliverable')
        .then((_deliverableNames: string[]) => {
          console.log(_deliverableNames);
          if (_deliverableNames) {
            deliverableNames = _deliverableNames;
            return _deliverableNames;
          }
          throw `No deliverable names found in ${payload.orgName}`;
        })
        .catch((err: any) => {
          logger.error(`GradeController::getGradesFromResults() getUniqueStringsInRow ERROR ${err}`);
        });
    })
    .then(() => {
      timestamp = new Date(deliverable.close.toString()).getTime();        
      console.log(timestamp);
      return db.getLatestResultRecords('results', timestamp, {
        orgName: course.githubOrg,
        deliverable: payload.deliverableName,
        timestamp: {'$lte' : timestamp}
      })
      .then((result: any[]) => {
        singleDelivResults = result;
        return result;
      });
    })
    .then(() => {
      if (payload.allDeliverables) {
        return Deliverable.find({courseId: course._id})
          .then((_deliverables: IDeliverableDocument[]) => {
            if (_deliverables) {
              deliverables = _deliverables;
              return deliverable;
            } 
            throw `Could not find Deliverables for ${course._id}`;
          })
          .catch((err: any) => {
            logger.error(`GradeController:: getGradesfromResults() ERROR ${err}`);
          });
      }
      return null;
    })
    .then(() => {
      // returns single deliverable results object to API if payload.allDeliverables is not selected.

      let allDelivQueries = [];
      if (payload.allDeliverables) {

        for (let i = 0; i < deliverableNames.length; i++) {

          // get new timestamp for each deliverable due date for query
          let index: number; 
          
          for (let j = 0; j < deliverables.length; j++) {
            let deliverableName1 = String(deliverables[j].name);
            let deliverableName2 = String(deliverableNames[i]);

            if (deliverableName1 === deliverableName2) {
              index = j;
              timestamp = new Date(deliverables[index].close.toString()).getTime();        
              
              let resultRecordsForDeliv = db.getLatestResultRecords('results', timestamp, {
                orgName: course.githubOrg,
                deliverable: deliverableNames[i],
                timestamp: {'$lte' : timestamp}
              })
              .then((result: any[]) => {
                return result;
              });
              allDelivQueries.push(resultRecordsForDeliv);
            }
          }
        }
        return Promise.all(allDelivQueries);
      } else {
        return singleDelivResults;
      }
    })
    .then((results) => {
      // if multiple arrays from allDelivQueries, combine them
      if (results.length > 0) {
        let concatedArray: any = [];
        results.map((item) => {
          concatedArray = concatedArray.concat(item);
        });
        return concatedArray;
      } else {
        return results;
      }
    })
    .then((results) => {
      // add CSID and SNUM info
      for (let i = 0; i < course.classList.length; i++) {
        let classListItem: IUserDocument = course.classList[i] as IUserDocument;
        let classListUsername = String(classListItem.username);
        for (let j = 0; j < results.length; j++) {
          let resultsUsername = String(results[j].username);
          if (resultsUsername === classListUsername) {
            results[j].csid = classListItem.csid;
            results[j].snum = classListItem.snum;
            results[j].lname = classListItem.lname;
            results[j].fname = classListItem.fname;

            // convert timestamp to actual date
            results[j].submitted = new Date(results[j].submitted - UNIX_TIMESTAMP_DIFFERENCE).toUTCString();
          }
        }
      }
      return results;
    })
    .then((results: any) => {
      // finally, convert to CSV based on class number and map to Interface type

      const CSV_COLUMNS_210 = ['csid', 'snum', 'lname', 'fname', 'username', 'submitted',
      'finalGrade', 'deliverableWeight', 'coverageGrade', 'testingGrade', 'coverageWeight',
      'testingWeight', 'coverageMethodWeight', 'coverageLineWeight', 'coverageBranchWeight'];
      const CSV_COLUMNS_310 = ['csid', 'snum', 'lname', 'fname', 'username', 'submitted',
        'finalGrade', 'deliverableWeight', 'passPercent', 'passCount', 'failCount', 'skipCount',
        'passNames', 'failNames', 'skipNames'];
      let csvArray: any = [];
        if (payload.courseId === '310') {
          csvArray.push(CSV_COLUMNS_310);
          
          for (let i = 0; i < results.length; i++) {
            let r = results[i];
            csvArray.push([r.csid, r.snum, r.name, r.fname, r.username, r.submitted, r.finalGrade,
            r.deliveableWeight, r.coverageGrade, r.testingGrade, r.coverageWeight, r.testingWeight,
            r.coverageMethodWeight, r.coverageLineWeight, r.coverageBranchWeight]);
          }
        } else {
          csvArray.push(CSV_COLUMNS_210);
          for (let i = 0; i < results.length; i++) {
            let r = results[i];
            csvArray.push([r.csid, r.snum, r.lname, r.fname, r.username, r.submitted, r.finalGrade,
            r.deliverableWeight, r.passPercent, r.passCount, r.failCount, r.skipCount, r.passNames.split(';'),
            r.failNames.split(';'), r.skipNames.split(';')]);
          }
        }
        // generate and return csv
        return csvGenerate(csvArray);
    });
}

export {getAllGradesByCourse, getReleasedGradesByCourse, create, addGradesCSV, getGradesFromResults};
