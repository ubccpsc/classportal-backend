import * as restify from 'restify';
import {logger} from '../../utils/logger';
import {Course, ICourseDocument} from '../models/course.model';
import {Team, ITeamDocument} from '../models/team.model';
import {Deliverable, IDeliverableDocument} from '../models/deliverable.model';
import {User, IUserDocument} from '../models/user.model';
import {Grade, IGradeDocument} from '../models/grade.model';
import {config} from '../../config/env';
import {GradePayloadContainer, GradeRow, GradeDetail} from '../interfaces/ui/grade.interface';
import {
  ResultRecord, ResultPayload, ResultPayloadContainer,
  ResultDetail, Student, ResultPayloadInternal
} from '../interfaces/ui/result.interface';
import db, {Database} from '../db/MongoDBClient';
import * as parse from 'csv-parse';
import mongodb = require('mongodb');

let context: Database = db;
let MongoClient = mongodb.MongoClient;
let fs = require('fs');
let stringify = require('csv-stringify');

/**
 * If no deliverableName given, then all deliverable marks returned
 * @param courseId courseId number of courseId ie. 310
 * @param deliverableName string name of deliverable ie. 'd2'
 * @param allDeliverables boolean if the report should include all deliverables
 * @param gradeOnly boolean if the report should be limited to only grade, snum, csid, and deliverable info.
 * @return string CSV formatted report
 */
function getResultsByCourse(payload: any) {

  logger.info(`ResultController:: getGradesfromResults() - start`);
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
          if (_deliv && payload.deliverableName) {
            deliverable = _deliv;
            return _deliv;
          }
          throw `Could not find deliverable under ${payload.deliverableName} and ${course.courseId}`;
        })
        .catch(err => {
          logger.error(`ResultController::getGradesFromResults() ERROR ${err}`);
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
          logger.error(`ResultController::getGradesFromResults() getUniqueStringsInRow ERROR ${err}`);
        });
    })
    .then(() => {

      // queries the highest grade and last grade, then merges both per user
      if (!payload.allDeliverables) {

        return db.getAllResultRecords('results', timestamp, {
          orgName:     course.githubOrg,
          deliverable: payload.deliverableName,
        })
          .then((results: any[]) => {
            console.log(results);
            singleDelivResults = results;
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
            logger.error(`ResultController:: getGradesfromResults() ERROR ${err}`);
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
      // if multiple arrays because allDeliverables = true, combine them
      if (payload.allDeliverables) {
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

      let mappedResults: ResultRecord[] = [];
      Object.keys(results).forEach((key) => {
        let resultDetail: ResultDetail[] = [];
        let reportFailed: boolean = results[key].reportFailed;
        let mappedObj: ResultRecord = {
          userName:       results[key].user,
          commitUrl:      results[key].commitUrl,
          projectName:    results[key].team,
          projectUrl:     results[key].projectUrl,
          branchName:     results[key].ref,
          gradeRequested: false,
          delivId:        results[key].deliverable,
          grade:          '0',
          timeStamp:      results[key].timestamp,
          gradeDetails:   resultDetail,
        };
        if (results[key].reportFailed === true) {
          mappedObj.grade = '0';
        } else {
          if (String(results[key].orgName) === 'CPSC210-2017W-T1' && reportFailed === false) {
            mappedObj.grade = results[key].report.tests.grade.finalGrade || '0';
          } else if (String(results[key].orgName) === 'CPSC310-2017W-T1' && reportFailed === false) {
            mappedObj.grade = results[key].report.tests.grade.finalGrade || '0';
          }
        }
        mappedResults.push(mappedObj);
      });

      // TODO: what we really want here is to convert Student[] -> StudentRecord[]
      // this just adds a .projectUrl to each Student
      // This will make it so we know what project a student is associated with for
      // a deliverable in case they never make a commit
      let students: Student[] = [];
      let classList: IUserDocument[] = course.classList as IUserDocument[];
      for (let student of classList) {
        let s: Student = {
          userName: student.username,
          userUrl:  'https://github.ubc.ca/' + student.username,
          fName:    student.fname,
          lName:    student.lname,
          sNum:     student.snum,
          csId:     student.csid,
          labId:    'UNASSIGNED',
          TA:       [''],
        };

        for (let labSection of course.labSections) {
          if (labSection.users.indexOf(student._id) > -1) {
            s.labId = labSection.labId;
          }
        }
        students.push(s);
      }

      let resultPayload: ResultPayloadInternal = {
        students: students,
        records:  mappedResults,
      };

      let newFormat = convertResultFormat(resultPayload);
      // NOTE: not returned yet

      return resultPayload;
    });
}


function convertResultFormat(data: ResultPayloadInternal) {
  console.log('ResultsView::convertResultsToGrades(..) - start');

  interface StudentResults {
    userName: string;
    student: Student;
    executions: ResultRecord[];
  }

  try {
    const start = new Date().getTime();

    // Just a caveat; this could all be done in one pass
    // but is split up for clarity into 4 steps:
    // 1) Create a student map
    // 2) Update students to know what their projectUrl is for the deliverable
    //    This is needed for teams, but not for single projects (but will work for both)
    // 3) Add executions to the Student record
    // 4) Choose the execution we care about from the Student record

    // map: student.userName -> StudentResults
    let studentMap: { [userName: string]: StudentResults } = {};
    for (let student of data.students) {
      const studentResult: StudentResults = {
        userName:   student.userName,
        student:    student,
        executions: []
      };
      studentMap[student.userName] = studentResult;
    }

    // map execution.projectUrl -> [StudentResults]
    let projectMap: { [projectUrl: string]: StudentResults[] } = {};
    for (let record of data.records) {
      if (record.delivId === this.delivId) { // HACK: the query should only get the right deliverables
        const student = studentMap[record.userName];
        if (typeof student !== 'undefined' && student.student.sNum !== '') {
          const key = record.projectUrl;
          if (key !== '') { // HACK: ignore missing key; this should not come back from the backend; fix and remove
            if (typeof projectMap[key] === 'undefined') {
              projectMap[key] = []; // we don't know about this project yet
            }
            const existingStudent = projectMap[key].find(function (student: StudentResults) {
              return student.userName === record.userName; // see if student is already associated with project
            });
            if (typeof existingStudent === 'undefined') {
              projectMap[key].push(studentMap[record.userName]); // add student to the project
            }
          } else {
            console.warn('WARN: missing key: ' + record.commitUrl);
          }
        } else {
          // this only happens if the student cause a result but was not in the student list
          // could happen for TAs / instructors, but should not happen for students
          console.log('WARN: unknown student (probably a TA): ' + record.userName);
        }
      } else {
        // wrong deliverable
      }
    }

    // add all project executions to student
    for (let record of data.records) {
      if (record.delivId === this.delivId) { // HACK: backend should return only the right deliverable
        if (record.projectUrl !== '') { // HACK: backend should only return complete records
          const studentResult = studentMap[record.userName];
          const project = projectMap[record.projectUrl];
          if (typeof project !== 'undefined' && typeof studentResult !== 'undefined') {
            for (let studentResult of project) {
              // associate the execution with all students on that project
              studentResult.executions.push(record);
            }
          } else {
            // drop the record (either the student does not exist or the project does not exist).
            // project case would happen if in the last loop we dropped an execution from a TA.
          }
        }
      } else {
        // wrong deliverable
      }
    }

    // now choose the record we want to emit per-student
    let studentFinal: StudentResults[] = [];
    for (let userName of Object.keys(studentMap)) {
      const studentResult = studentMap[userName];
      const executionsToConsider = studentResult.executions;

      let result: ResultRecord;
      if (executionsToConsider.length > 0) {
        // in this case we're going to take the last execution
        // but you can use any of the ResultRecord rows here (branchName, gradeRequested, grade, etc.)
        const orderedExecutions = executionsToConsider.sort(function (a: ResultRecord, b: ResultRecord) {
          return b.timeStamp - a.timeStamp;
        });
        result = orderedExecutions[0];
      } else {
        // no execution records for student; put in a fake one that counts as 0
        console.log('WARN: no execution records for student: ' + userName);
        result = {
          userName:       userName,
          timeStamp:      -1, // never happened
          projectName:    'No Request', // unknown
          projectUrl:     '', //
          commitUrl:      '',
          branchName:     '',
          gradeRequested: false,
          grade:          '0',
          delivId:        this.delivId,
          gradeDetails:   []
        };
      }
      const finalStudentRecord = {
        userName:   userName,
        student:    studentResult.student,
        executions: [result]
      };
      studentFinal.push(finalStudentRecord);
    }

    const delta = new Date().getTime() - start;
    console.log('Result->Grade conversion complete; # students: ' + data.students.length +
      '; # records: ' + data.records.length + '. Took: ' + delta + ' ms');

    this.dataToDownload = studentMap;
    // this array can be trivially iterated on to turn into a CSV or any other format
    return studentFinal;
  } catch (err) {
    console.error('ResultView::convertResultsToGrades(..) - ERROR: ' + err.members, err);
    return {}; // TODO: return something better here
  }

}


/**
 *
 * @param _course The Course that you are getting the Grades for
 * @param _results The results rendered from getGradesFromResults() so we can append marks based on Team
 * @return Promise<any[]> Array of results, but with team marks merged
 */
function mapResultsToTeams(_course: ICourseDocument, _results: any) {
  logger.info(`ResultController:: mapResultsToTeams(..) - start`);

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

export {getResultsByCourse};