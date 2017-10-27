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

export class Results {
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
          let reportFailed: boolean = results[key].reportFailed;
          let mappedObj: ResultRecord = {
            userName:       results[key].user,
            commitUrl:      results[key].commitUrl,
            projectName:    results[key].team,
            projectUrl:     results[key].projectUrl,
            branchName:     results[key].ref,
            gradeRequested: results[key].gradeRequested,
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
        let students: StudentResult[] = [];
        let classList: IUserDocument[] = course.classList as IUserDocument[];
        let repoUrl: string = '';
        for (let student of classList) {
          if (teams) {
            for (let team of teams) {
              if (team.members.indexOf(student._id) > -1) {
                // team Lab URL should be '' if repo has not yet been created
                repoUrl = team.githubState.repo.url;
              }
            }
          }
          if (projects) {
            for (let project of projects) {
              if (String(project.student) === String(student._id)) {
                // team Lab URL should be '' if repo has not yet been created
                repoUrl = project.githubState.repo.url;
              }
            }
          }

          let s: StudentResult = {
            userName:   student.username,
            userUrl:    'https://github.ubc.ca/' + student.username,
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

// export {getResultsByCourse};
