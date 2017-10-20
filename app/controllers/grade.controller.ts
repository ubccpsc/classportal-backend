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

/**
 * If no deliverableName given, then all deliverable marks returned
 * @param courseId courseId number of courseId ie. 310
 * @param deliverableName string name of deliverable ie. 'd2'
 * @param allDeliverables boolean if the report should include all deliverables
 * @param gradeOnly boolean if the report should be limited to only grade, snum, csid, and deliverable info.
 * @return string CSV formatted report
 */
function getGradesFromResults(payload: any) {

  const REPORT_FAILED_FLAG: string = 'REPORT_FAILED';
  const CSV_FORMAT_FLAG = 'csv';

  let teams: ITeamDocument;
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
          if (_deliv && !payload.allDeliverables) {
            deliverable = _deliv;
            return _deliv;
          }
          throw `Could not find deliverable under ${payload.deliverableName} and ${course.courseId}`;
        })
        .catch(err => {
          logger.error(`GradeController::getGradesFromResults() ERROR ${err}`);
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

      // queries the highest grade and last grade, then merges both per user
      if (!payload.allDeliverables) {

        timestamp = new Date(deliverable.close.toString()).getTime();
        return db.getAllResultRecords('results', timestamp, {
          orgName:     course.githubOrg,
          deliverable: payload.deliverableName,
        })
          .then((results: any[]) => {
            return results;
          });
      }
      return null;
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

              let allResultRecordsForDeliv = db.getAllResultRecords('results', timestamp, {
                orgName:     course.githubOrg,
                deliverable: deliverableNames[i],
              })
                .then((results: any[]) => {
                  return results;
                });
              allDelivQueries.push(allResultRecordsForDeliv);
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
      // render and clean data for front-end

      Object.keys(results).forEach((key) => {
        if (results[key].hasOwnProperty('projectUrl') && results[key].hasOwnProperty('commit')) {
          let appendage = '/commit/' + results[key].commit;
          results[key].projectUrl = String(results[key].projectUrl).replace('.git', '').replace('<token>@', '');
          results[key].commitUrl = results[key].projectUrl + appendage;
        }

        // add in lname, fname, labId, snum
        // adds in labId *only if* user._id matches id listed under lab for a course
        if (results[key].hasOwnProperty('user')) {
          let username = String(results[key].user).toLowerCase();
          let userId: IUserDocument;
          for (let i = 0; i < course.classList.length; i++) {
            let classListItem: IUserDocument = course.classList[i] as IUserDocument;
            let classListUsername = String(classListItem.username.toLowerCase());
            if (username === classListUsername) {
              userId = classListItem._id;
              results[key].lname = classListItem.lname;
              results[key].fname = classListItem.fname;
              results[key].snum = classListItem.snum;
              results[key].csid = classListItem.csid;              
              for (let j = 0; j < course.labSections.length; j++) {
                if (course.labSections[j].users.indexOf(userId) > 0) {
                  results[key].labId = course.labSections[j].labId;
                }
              }
            }
          }
        }
      });
      return mapGradesToUsersForTeams(course, results)
        .then((results) => {
          let mappedResults: ResultRecord[] = [];
          Object.keys(results).forEach((key) => {
            let resultDetail: ResultDetail[] = [];
            let reportFailed: boolean = results[key].reportFailed;
            let mappedObj: ResultRecord = {
              userName: results[key].user,
              commitUrl: results[key].commit,
              projectName: results[key].team,
              projectUrl: '',
              branchName: results[key].ref,
              gradeRequested: false,
              delivId: results[key].deliverable,
              grade: '0',
              timeStamp: results[key].timestamp,
              gradeDetails: resultDetail,
            };
            if (results[key].reportFailed === true) {
                mappedObj.grade = '0';
            } else {
              if (String(results[key].orgName) === 'CPSC210-2017W-T1' && reportFailed === false) {
                mappedObj.projectUrl = String(results[key].report.studentInfo.projectUrl).replace('<token>@', '')
                  .replace('.git', '');                
                mappedObj.commitUrl = mappedObj.projectUrl + '/commit/' + mappedObj.commitUrl;                  
                mappedObj.grade = results[key].report.tests.grade.finalGrade || '0';
              } else if (String(results[key].orgName) === 'CPSC310-2017W-T1' && reportFailed === false) {
                mappedObj.projectUrl = String(results[key].report.studentInfo.projectUrl).replace('<token>@', '')
                .replace('.git', '');  
                mappedObj.commitUrl = mappedObj.projectUrl + '/commit/' + mappedObj.commitUrl;
                mappedObj.grade = results[key].report.tests.grade.finalGrade || '0';
              }
            }
            mappedResults.push(mappedObj);
          });

          let students: Student[] = [];
          let classList: IUserDocument[] = course.classList as IUserDocument[];
          for (let student of classList) {
            let s: Student = {
              userName: student.username,
              userUrl: 'https://github.ubc.ca/' + student.username,
              fName: student.fname,
              lName: student.lname,
              sNum: student.snum,
              csId: student.csid,
              labId: 'UNASSIGNED',
              TA: [''],
            };

            for (let labSection of course.labSections) {
              if (labSection.users.indexOf(student._id) > -1) {
                s.labId = labSection.labId;
              }
            }
            students.push(s);
          }

          let resultPayload: ResultPayload = {
            students: students,
            records: mappedResults,
          };
          return resultPayload;
        });
    });
}

/**
 * 
 * @param _course The Course that you are getting the Grades for
 * @param _results The results rendered from getGradesFromResults() so we can append marks based on Team
 * @return Promise<any[]> Array of results, but with team marks merged
 */
function mapGradesToUsersForTeams(_course: ICourseDocument, _results: any) {
  let deliverables: IDeliverableDocument[];
  let delivIds: string[] = [];
  let teams: ITeamDocument[];
  let course: ICourseDocument = _course;
  let results: any = _results;
  const MAX_GRADE_FLAG = 'Max';
  const LAST_GRADE_FLAG = 'Last';
  const UNDEFINED_GRADE = 99999999999;
  
  return Deliverable.find({courseId: _course._id})
    .then((_delivs: IDeliverableDocument[]) => {
      if (_delivs) {
        deliverables = _delivs;
        for (let i = 0; i < deliverables.length; i++) {
          delivIds.push(String(deliverables[i].name));
        }
        return _delivs;
      }
      throw 'Cannot find Deliverables under markInBatch: true and Course ' + _course.courseId;
    })
    .then(() => {
      return Team.find({courseId: _course._id, deliverableIds: {$exists: true}})
        .populate('members')
        .then((_teams: ITeamDocument[]) => {
          if (_teams) {
            teams = _teams;
            return _teams;
          }
          throw `Could not find any Teams under course ${course.courseId} with deliverableIds property`; 
        });
    })
    .then(() => {
      let teamMembers: string[] = [];

      // find highestGrade and lastGrade per team and then overwrite 
      // results that have delivMax and delivLast value matches
      // must do this for each DELIV_ID from delivIds 

      for (let DELIV_ID of delivIds) {

        for (let i = 0; i < teams.length; i++) {
          
        let highestGrade: number = 0;
        let highestCommit: string = null;
        let lastGrade: number = UNDEFINED_GRADE;
        let lastCommit: string = null;
        let lastSubmitted: number = 0;
        let keysToUpdateForMax: string[] = []; 
        let keysToUpdateForLast: string[] = [];
          
        for (let j = 0; j < teams[i].members.length; j++) {
          teamMembers.push(teams[i].members[j].username);
        }
          
        // for every result record entry, check for matching delivIds and store latest / highest item.
        Object.keys(results).forEach(key => {

          let delivId = String(results[key].delivId);
          let gradeKey = String(results[key].gradeKey);

          if (delivId === DELIV_ID && teamMembers.indexOf(results[key].username) > -1) {

            // get the highest grade per team and deliverable
            if (gradeKey.indexOf(MAX_GRADE_FLAG) > -1) {
              if (highestGrade < results[key].gradeValue) {
                highestGrade = results[key].gradeValue;
                highestCommit = results[key].commit;
              }
              // based on DELIV_ID, username, and 'Max' in Results flag matching, push to update
              keysToUpdateForMax.push(key);              
            }

            if (gradeKey.indexOf(LAST_GRADE_FLAG) > -1) {
              if (lastSubmitted < results[key].submitted) {
                lastGrade = results[key].gradeValue;
                lastCommit = results[key].commit;
                lastSubmitted = results[key].submitted;
              }
              // push keys to update afterwards to for last grade Results
              keysToUpdateForLast.push(key);
            }
          }
        });
          
        // update grade with highest grade for each student on team
        for (let k = 0; k < keysToUpdateForMax.length; k++) {
          results[keysToUpdateForMax[k]].commit = highestCommit;
          results[keysToUpdateForMax[k]].gradeValue = highestGrade;
        }

        for (let k = 0; k < keysToUpdateForLast.length; k++) {
          results[keysToUpdateForLast[k]].commit = lastCommit;
          results[keysToUpdateForLast[k]].gradeValue = lastGrade;
        }

        // clear teamMembers and keysToUpdate to prep for next Team iteration;
        keysToUpdateForMax = [];
        keysToUpdateForLast = [];
        teamMembers = [];
        highestGrade = 0;
        lastSubmitted = 0;
        lastGrade = UNDEFINED_GRADE;
      }
    }
      return results;
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

export {getAllGradesByCourse, getReleasedGradesByCourse, create, addGradesCSV, getGradesFromResults};
