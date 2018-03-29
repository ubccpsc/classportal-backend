import * as restify from 'restify';
import {logger} from '../../utils/logger';
import {Course, ICourseDocument} from '../models/course.model';
import {Team, ITeamDocument} from '../models/team.model';
import {Project, IProjectDocument} from '../models/project.model';
import {Deliverable, IDeliverableDocument} from '../models/deliverable.model';
import {User, IUserDocument} from '../models/user.model';
import {Grade, IGradeDocument} from '../models/grade.model';
import {config} from '../../config/env';
import {GradePayloadContainer, GradeRow, GradeDetail} from '../interfaces/ui/grade.interface';
import {
  ResultRecord, ResultPayload, ResultPayloadContainer,
  ResultDetail, Student, ResultPayloadInternal, StudentResult
} from '../interfaces/ui/result.interface';
import db, {Database} from '../db/MongoDBClient';
import * as parse from 'csv-parse';
import mongodb = require('mongodb');

let context: Database = db;
let MongoClient = mongodb.MongoClient;
let fs = require('fs');
let stringify = require('csv-stringify');

// NOTE: Your custom business logic report, which will not be read by AutoTest or ClassPortal, but held onto
// if it is necessary to hold onto it for export at a convenience time.
//
// IMPORTANT: The final grade will be read by ClassPortal for rendering grade information.

export interface MyReport {
  finalGrade: number;
  custom: Object;
}

export interface ResultRecord {
  team: string;
  repo: string;
  state: string;
  projectUrl: string;
  commitUrl: string;
  orgName: string;
  deliverable: string;
  postbackOnComplete: boolean;
  courseNum: number;
  user: string;
  timestamp: number;
  ref: string;
  custom: object;
  // REPORT: Customizable data object for you.
  // 'null' will default to zero grade in ClassPortal;
  report: MyReport;
  container: Object;
  githubFeedback: string;
  gradeRequested: boolean;
  gradeRequestedTimestamp: number;
  attachments: object[];
}

export class Results {

  /**
   * @param courseId courseId number of courseId ie. 310
   * @param deliverableName string name of deliverable ie. 'd2'
   * @return ResultPayload
   */
  public NEWNOTWORKINGgetResultsByCourse(payload: any) {

    logger.info(`ResultController::getGradesfromResults() - start`);
    const REPORT_FAILED_FLAG: string = 'REPORT_FAILED';
    const CSV_FORMAT_FLAG = 'csv';

    let teams: ITeamDocument[];
    let projects: IProjectDocument[];
    let course: ICourseDocument;
    let deliverables: IDeliverableDocument[];
    let deliverable: IDeliverableDocument;
    let deliverableNames: string[];
    let timestamp: number;
    let singleDelivResults: any[];
    let allDelivResults: any[];

    const courseId = payload.courseId;
    const delivId = payload.deliverableName;

    let that = this;

    that.getDeliverableRows(courseId, delivId).then(function (executions) {
      logger.info("resultController:getResultsByCourse - executions retrieved");


      // TODO: get the students
      return that.getStudentRows(courseId).then(function (students: any) {
        logger.info("resultController:getResultsByCourse - students retrieved");


        // update student projectUrl rows


        // TODO: none of this working
        // let students: any = {};
        let mappedResults: any = {};

        let resultPayload: ResultPayloadInternal = {
          students: students,
          records:  mappedResults,
        };

        let newFormat = this.convertResultFormat(resultPayload, payload.deliverableName);
        // return resultPayload;
        return newFormat;
      });


    }).catch(function (err) {
      logger.error("resultController:getResultsByCourse - ERROR: " + err);
      return {error: err};
    });

  }


  private getStudentRows(courseId: string): Promise<{}> {
    logger.info('result.controller::getStudentRows(..) - start; course: ' + courseId);
    let that = this;

    const url = config.db;
    // FOR LOCAL DEBUGGING:
    // const url = <PROD_DB_VALUE_FROM_ENV_FILE>
    return new Promise(function (resolve, reject) {
      MongoClient.connect(url).then(function (db) {
        logger.info(`result.controller::getStudentRows(..) - Returning DB Connection: ${url}`);

        // const ORG = orgName; // 'CPSC210-2017W-T1'; //'CPSC310-2017W-T1'; // 'CPSC310-2017W-T2'
        // const DELIV = delivId; // 'd0';

        const start = new Date().getTime();
        // let resultsArr: any[] = [];
        // let latestResultPerProjectArr: any[] = [];
        // let rowRetriever =

        let query = {
          courseId: courseId // NOTE: not a number in this table
        };

        let projection = {
          _id:  true,
          name: true // really just for debugging
        };

        // logger.info('query: ' + JSON.stringify(query));
        // logger.info('projection: ' + JSON.stringify(projection));

        db.collection('courses').find(query, projection).toArray().then(function (courses) {
          console.log('result.controller::getStudentRows(..) - retrieving courses: ' + courses.length);
          let courseIDref = courses[0]._id;

          db.collection('users').find({
            "courses":
              {
                $in: [courseIDref]
              }
          }).toArray().then(function (students: any) {
            console.log('result.controller::getStudentRows(..) - retrieving students: ' + students.length);


            let studentList: StudentResult[] = [];
            for (const student of students) {

              let s: StudentResult = <StudentResult>{ // CAST because _id is not allowed
                _id:        student._id,
                userName:   student.username,
                userUrl:    student.profileUrl,
                fName:      student.fname,
                lName:      student.lname,
                sNum:       student.snum,
                csId:       student.csid,
                labId:      '', // TODO: why is this not in student?
                TA:         [''],
                projectUrl: '' // Fill this in later
              };

              studentList.push(s);
            }


            /// THIS DOES NOT MAKE ANY SENSE

            // I need to know what repo a student is associated with for a deliverable

            // but this means using the Users._id to join with Teams._members
            // and then using that Teams._id to join with Deliverables._id somehow to make sure the team is for the right deliverable

            // I am giving up and creating an issue. This code will stay because it will be helpful when I refactor the database in the future.


            // I NEED THE TEAM ID FOR A


            // query = {

            // }

            // _id: {$in: teamArr}
            // db.collection('users').find
            // const took = (new Date().getTime() - start);
            // console.log('dashboard.controller::getStudentRows(..) - retrieving data; # teams: ' + students.length + '; second search took: ' + took + ' ms');

            // process records for dashboard
            // let returnRows = that.populateRecords(res, delivId); // latestResultPerProjectArr

            // resolve(returnRows);



            resolve(studentList);
          });

        }).catch(function (err) {
          console.log('dashboard.controller::getStudentRows(..) - ERROR: ' + err);
          reject(err);
        });
      });
    });
  }


  private getDeliverableRows(courseId: string, delivId: string): Promise<{}> {
    logger.info('result.controller::getDeliverableRows(..) - start; course: ' + courseId + '; delivId: ' + delivId);
    let that = this;

    const url = config.db;
    // FOR LOCAL DEBUGGING:
    // const url = <PROD_DB_VALUE_FROM_ENV_FILE>
    return new Promise(function (resolve, reject) {
      MongoClient.connect(url).then(function (db) {
        logger.info(`result.controller::getDeliverableRows(..) - Returning DB Connection: ${url}`);

        // const ORG = orgName; // 'CPSC210-2017W-T1'; //'CPSC310-2017W-T1'; // 'CPSC310-2017W-T2'
        // const DELIV = delivId; // 'd0';

        const start = new Date().getTime();
        // let resultsArr: any[] = [];
        // let latestResultPerProjectArr: any[] = [];
        // let rowRetriever =

        let query = {
          courseNum:   Number(courseId), // HACK: this will be problematic for non-numeric courses (e.g., edX MM)
          deliverable: delivId
        };

        let projection = {
          _id:        true, // would like to replace this with a more github-specific id
          idStamp:    true,
          team:       true,
          report:     true,
          project:    true,
          user:       true,
          url:        true,
          // stdioRef:   true,
          commit:     true,
          commitUrl:  true,
          timestamp:  true,
          projectUrl: true
        };

        // logger.info('query: ' + JSON.stringify(query));
        // logger.info('projection: ' + JSON.stringify(projection));

        db.collection('results').find(query, projection).sort({
          timestamp: -1
        }).toArray().then(function (res) {
          console.log('result.controller::getDeliverableRows(..) - retrieving rows: ' + res.length);

          const took = (new Date().getTime() - start);
          console.log('dashboard.controller::getDeliverableRows(..) - retrieving data; # teams: ' + res.length + '; second search took: ' + took + ' ms');

          // process records for dashboard
          let returnRows = that.populateRecords(res, delivId); // latestResultPerProjectArr

          resolve(returnRows);
        }).catch(function (err) {
          console.log('dashboard.controller::getDeliverableRows(..) - ERROR: ' + err);
          reject(err);
        });
      });
    });
  }

  private populateRecords(records: any, delivId: string) {

    let returnRows = [];
    for (let rec of records) {
      let row: any = {};

      // e.g., if the test container failed
      let missingTestDetails = typeof rec.report === 'undefined' ||
        rec.report === null ||
        typeof rec.report.tests === 'undefined' ||
        rec.report.tests === null ||
        typeof rec.report.tests.detailedResults === 'undefined';

      let missingUserDetails = typeof rec.report === 'undefined' ||
        rec.report === null ||
        typeof rec.report.studentInfo === 'undefined' ||
        typeof rec.report.studentInfo.projectUrl === 'undefined';

      row.project = rec.team;
      row.user = rec.user;
      // row.stdioRef = rec.stdioRef;
      row.commit = rec.commit;
      row.projectUrl = rec.projectUrl;
      row.team = rec.team;

      if (typeof rec.report !== 'undefined' && rec.report !== null && typeof rec.report.scoreOverall !== 'undefined') { // TODO: should be more comprehensive
        // jan 2018 310 container result
        missingTestDetails = false;

        if (typeof rec.projectUrl !== 'undefined') {
          missingUserDetails = false;
        }
      }

      row.url = 'UNKNOWN_REPORT_FAILED'; // TODO: make sure the commit URL always gets in there

      if (missingUserDetails === true) {
        row.url = rec.commitUrl;
        // row.url = row.idStamp; // HACK it would be better if there was a rec.url
        // TODO: make this more verbose (e.g., 5 min timeout? something else?)
        row.error = 'Something is not right with this execution, see stdio.txt';
      } else {
        /*
        let rawURL = rec.report.studentInfo.projectUrl;
        rawURL = rawURL.replace('<token>@', ''); // HACK; would be better if there was a rec.url
        rawURL = rawURL.replace('.git', ''); // HACK; would be better if there was a rec.url
        rawURL = rawURL + '/commit/' + rec.report.studentInfo.projectCommit;
        row.url = rawURL;
        */
        row.url = rec.commitUrl;
        row.error = ''; // exists, but is empty
      }

      row.timestamp = Number(Number(rec.timestamp).toFixed(0)); // get rid of '.0' if it exists

      if (missingTestDetails === true) {
        // probably row.error will be set to something useful too
        row.grade = -1;
        // row.scoreTest = -1;
        // row.scoreCover = -1;
      } else {
        let grade = -1;
        // let scoreTest = -1;
        // let scoreCover = -1;

        if (typeof rec.report.scoreOverall !== 'undefined') {
          // Jan 2018 containers
          grade = rec.report.scoreOverall;
          // scoreTest = rec.report.scoreTest;
          // scoreCover = rec.report.scoreCover;

          if (grade === null) {
            grade = 0;
          }
          // if (scoreTest === null) {
          // scoreTest = 0;
          // }
          // if (scoreCover === null) {
          // scoreCover = 0;
          // }

        } else {
          // older containers
          grade = rec.report.tests.grade.finalGrade;

          // 210
          // if (typeof rec.report.tests.custom !== 'undefined') {
          // if (typeof rec.report.tests.custom.testingGrade !== 'undefined') {
          // scoreTest = rec.report.tests.custom.testingGrade;
          // }
          // if (typeof rec.report.tests.custom.coverageGrade !== 'undefined') {
          //               scoreCover = rec.report.tests.custom.coverageGrade;
          //          }
          // }

          // 310
          // if (typeof rec.report.custom !== 'undefined') {
          //   if (typeof rec.report.custom.testStats !== 'undefined') {
          //     scoreTest = rec.report.custom.testStats.passPercent;
          //   }
          // }

          // 310
          // if (typeof rec.report.coverage !== 'undefined' && typeof rec.report.coverage.lines !== 'undefined') {
          //  scoreCover = rec.report.coverage.lines.percentage;
          // }
        }
        row.grade = grade;
        // row.scoreTest = scoreTest;
        // row.scoreCover = scoreCover;
      }

      returnRows.push(row);
    }

    // TODO: add more detail here to this result object
    console.log('result.controller::getDeliverableRows(..) - returnRows ready: ' + returnRows.length);
    return returnRows;
  }


  /**
   * @param courseId courseId number of courseId ie. 310
   * @param deliverableName string name of deliverable ie. 'd2'
   * @return ResultPayload
   */
  public getResultsByCourse(payload: any) {

    logger.info(`ResultController::getGradesfromResults() - start`);
    const REPORT_FAILED_FLAG: string = 'REPORT_FAILED';
    const CSV_FORMAT_FLAG = 'csv';

    let teams: ITeamDocument[];
    let projects: IProjectDocument[];
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
        throw new Error(`Could not find Course ${payload.courseId}`);
      })
      .then(() => {
        return Deliverable.findOne({name: payload.deliverableName, courseId: course._id})
          .then((_deliv: IDeliverableDocument) => {
            if (_deliv && payload.deliverableName) {
              deliverable = _deliv;
              return _deliv;
            }
            throw new Error(`Could not find deliverable under ${payload.deliverableName} and ${course.courseId}`);
          })
          .catch(err => {
            logger.error(`ResultController::getGradesFromResults() ERROR ${err}`);
          });
      })
      .then(() => {
        return db.getUniqueStringsInRow('results', {orgName: course.githubOrg}, 'deliverable')
          .then((_deliverableNames: string[]) => {
            if (_deliverableNames) {
              deliverableNames = _deliverableNames;
              return _deliverableNames;
            }
            throw new Error(`No deliverable names found in ${payload.orgName}`);
          })
          .catch((err: any) => {
            logger.error(`ResultController::getGradesFromResults() getUniqueStringsInRow ERROR ${err}`);
          });
      })
      .then(() => {
        let promises = [];
        let teamsQuery = Team.find({$or: [{deliverableIds: deliverable._id}, {deliverableId: deliverable._id}]})
          .then((_team: ITeamDocument[]) => {
            if (_team) {
              teams = _team;
              return _team;
            }
            return null;
          });
        let projectsQuery = Project.find({deliverableId: deliverable._id})
          .then((_projects: IProjectDocument[]) => {
            if (_projects) {
              projects = _projects;
              return _projects;
            }
            return null;
          });
        return promises.push(teamsQuery, projectsQuery);
      })
      .then(() => {

        // queries the highest grade and last grade, then merges both per user
        if (!payload.allDeliverables) {

          return db.getAllResultRecords('results', timestamp, {
            orgName:     course.githubOrg,
            deliverable: payload.deliverableName,
          })
            .then((results: any[]) => {
              // console.log(results);  // too verbose
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
              throw new Error(`Could not find Deliverables for ${course._id}`);
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
          let reportFailed: boolean;
          if (typeof results[key].reportFailed === 'undefined') {
            reportFailed = false; // be optimistic, if the field is missing it should have been all good!
          } else {
            reportFailed = results[key].reportFailed;
          }

          let mappedObj: ResultRecord = {
            userName:                results[key].user,
            commitUrl:               results[key].commitUrl,
            projectName:             results[key].team,
            projectUrl:              results[key].projectUrl,
            branchName:              results[key].ref,
            gradeRequested:          results[key].gradeRequested,
            gradeRequestedTimeStamp: results[key].gradeRequestedTimestamp,
            delivId:                 results[key].deliverable,
            grade:                   '0',
            timeStamp:               results[key].timestamp,
            gradeDetails:            resultDetail,
          };
          if (reportFailed === true) {
            mappedObj.grade = '0';
          } else {
            const orgName = String(results[key].orgName);
            if (orgName === 'CPSC210-2017W-T2' && reportFailed === false) { // HACK: org shouldn't be hard coded
              mappedObj.grade = results[key].report !== null ? results[key].report.tests.grade.finalGrade : '0';
            } else if (orgName === 'CPSC310-2017W-T2' && reportFailed === false) { // HACK: org shouldn't be hard coded
              // mappedObj.grade = results[key].report.tests.grade.finalGrade || '0'; // OLD (pre 2017-T2)
              // logger.info("result: " + JSON.stringify(results[key]));
              if (typeof results[key].report !== 'undefined' &&
                results[key].report !== null &&
                typeof results[key].report.scoreOverall !== 'undefined' &&
                results[key].report.scoreOverall !== null) {
                mappedObj.grade = results[key].report.scoreOverall || '0';
              } else {
                mappedObj.grade = '0';
              }
            } else if (orgName !== 'CPSC310-2017W-T2' && orgName !== 'CPSC210-2017-T2') {
              // NOTE FOR REID et al.: Next semester, going forward, this will break, but 210 and 310 should both implement a similar
              // structure by then, as hard-wiring this code will not work in the long-run. Flatter structure is implemented
              // in demo container.

              // PLEASE SEE THE NEW INTERFACE AT THE TOP OF THE RESULT CONTROLLER. IT IS UNIMPLEMENTED, BUT PART OF THE DOCUMENTATION
              // INSTRUCTIONS ON SETTING UP A CONTAINER.
              if (typeof results[key].report !== 'undefined' && results[key].report !== null) {
                mappedObj.grade = results[key].report.finalGrade;
              }
            }
          }
          mappedResults.push(mappedObj);
        });

        // TODO: what we really want here is to convert Student[] -> StudentRecord[]
        // this just adds a .projectUrl to each Student
        // This will make it so we know what project a student is associated with for
        // a deliverable in case they never make a commit
        let students: StudentResult[] = [];
        let classList: IUserDocument[] = course.classList as IUserDocument[];
        let repoUrl: string = '';
        for (let student of classList) {
          if (teams) {
            for (let team of teams) {
              if (team.members.indexOf(student._id) > -1) {
                // team Lab URL should be '' if repo has not yet been created
                // TODO: this is the problematic statement for d2 (or below)
                repoUrl = team.githubState.repo.url;
              }
            }
          }
          if (projects) {
            for (let project of projects) {
              if (String(project.student) === String(student._id)) {
                // TODO: this is the problematic statement for d2 (or above)
                // team Lab URL should be '' if repo has not yet been created
                repoUrl = project.githubState.repo.url;
              }
            }
          }

          let s: StudentResult = {
            userName:   student.username,
            userUrl:    'https://github.ugrad.cs.ubc.ca/' + student.username, // HACK: shouldn't hardcode URL prefix
            fName:      student.fname,
            lName:      student.lname,
            sNum:       student.snum,
            csId:       student.csid,
            labId:      'UNASSIGNED',
            TA:         [''],
            projectUrl: repoUrl,
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

        let newFormat = this.convertResultFormat(resultPayload, payload.deliverableName);
        // return resultPayload;
        return newFormat;
      });
  }


  private convertResultFormat(data: ResultPayloadInternal, delivId: string): ResultPayload {
    console.log('ResultController::convertResultFormat(..) - start');
    try {
      const start = new Date().getTime();

      for (let s of data.students) {
        if (s.projectUrl === '') {
          console.warn('ResultController::convertResultFormat(..) - WARN: missing student.projectUrl for student: ' + s.userName);
        }
      }

      // create the execution map
      // map execution.projectUrl -> [StudentResults]
      let projectMap: { [projectUrl: string]: ResultRecord[] } = {};
      for (let record of data.records) {
        if (record.delivId === delivId) { // HACK: the query should only get the right deliverables
          const key = record.projectUrl;
          if (key !== '') { // HACK: ignore missing key; this should not come back from the backend; fix and remove
            if (typeof projectMap[key] === 'undefined') {
              projectMap[key] = [record]; // start the record for this project
            } else {
              projectMap[key].push(record); // add to the existing record for this project
            }
          } else {
            console.warn('ResultController::convertResultFormat(..) - WARN: missing projectUrl for commit: ' + record.commitUrl);
          }
        } else {
          // wrong deliverable
        }
      }

      const delta = new Date().getTime() - start;
      console.log('ResultController::convertResultFormat(..) - complete; # students: ' + data.students.length +
        '; # records: ' + data.records.length + '. Took: ' + delta + ' ms');

      let returnObj: ResultPayload = {
        students:   data.students,
        projectMap: projectMap
      };

      return returnObj;

    } catch (err) {
      console.error('ResultController::convertResultFormat(..)  - ERROR: ' + err.members, err);
      return {students: [], projectMap: {}}; // empty return
    }

  }


  /**
   *
   * @param _course The Course that you are getting the Grades for
   * @param _results The results rendered from getGradesFromResults() so we can append marks based on Team
   * @return Promise<any[]> Array of results, but with team marks merged
   */
  private mapResultsToTeams(_course: ICourseDocument, _results: any) {
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
        throw new Error('Cannot find Deliverables under markInBatch: true and Course ' + _course.courseId);
      })
      .then(() => {
        return Team.find({courseId: _course._id, deliverableIds: {$exists: true}})
          .populate('members')
          .then((_teams: ITeamDocument[]) => {
            if (_teams) {
              teams = _teams;
              return _teams;
            }
            throw new Error(`Could not find any Teams under course ${course.courseId} with deliverableIds property`);
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

  private sortArrayByLastName(csvArray: any[]) {
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
}
