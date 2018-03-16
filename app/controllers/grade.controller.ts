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

export interface GradeUploadResponse {
  cannotUpdate: any[]; // UploadGradeCSV objects
  updatedGrades: IGradeDocument[];
}

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

/**
 * Grade Upload through a CSV.
 * 
 * IMPORTANT: Required headers: CSID, SNUM, GRADE
 *            Optional header: COMMENTS
 *            CSV SENT TO 'gradesFile' path in payload.
 * 
 *            - If new list is uploaded, older entries will continue to exist if they are not included in the new list.
 *            - Grade will be empty string if left empty. Zeros must be explicitly assigned in grades column.
 *            - Comments will be empty if not included.
 * @param req.params.courseId CourseId string such as '310', '210'
 * @param req.params.delivName deliverable.name such as 'd1', 'd2'
 * @param req.files.gradesFile.path upload CSV location. (managed by Restify)
 * @return IGradeDocument[] list of updated grades under the delivName and courseId
 */
function addGradesCSV(req: any): Promise<GradeUploadResponse> {

  let course: ICourseDocument;
  let deliv: IDeliverableDocument;
  let allStudentsExist: boolean = true;
  let cannotUpdate: any = [];

  // CSV parser options
  const options = {
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
  };

  return Course.findOne({courseId: req.params.courseId})
    .populate('classList')
    .then((_course: ICourseDocument) => {
      if (_course) {
        course = _course;
        return _course;
      }
      throw 'Could not find Course ' + req.params.courseId;
    })
    .then((_course: ICourseDocument) => {
      return Deliverable.findOne({name: req.params.delivName, courseId: course._id})
        .then((_deliv: IDeliverableDocument) => {
          if (_deliv) {
            deliv = _deliv;
            return _deliv;
          }
          throw 'Could not find Deliverable ID ' + req.params.delivName + '.';
        });
    })
    .then((deliv: IDeliverableDocument) => {
      // Updates grade if exists, creates grade if does not exist.
      let gradePromises: any = [];
      let updatedGrades: IGradeDocument[] = [];

      return csvParser(req.files.gradesFile.path, options).then((result: any) => {
        console.log('PARSING CSV GRADES', result);
        for (let i = 0; i < result.length; i++) {
          let user: IUserDocument;

          // Identify user to join fname and lname
          let studentExists: boolean = false;

          course.classList.map((u: IUserDocument) => {
            if (typeof result[i].SNUM !== 'undefined' && u.snum === result[i].SNUM) {
              user = u;
              studentExists = true;
            } else if (typeof result[i].CSID !== 'undefined' && u.csid === result[i].CSID) {
              user = u;
              studentExists = true;
            } else if (typeof result[i].CWL !== 'undefined' && u.username === result[i].CWL) {
              user = u;
              studentExists = true;
            }
          });

          // If student does not exist, return it in an additional payload object.
          if (!studentExists) {
            logger.warn('GradeController:: csvParser() WARNING: Student does not exist ', result[i]);
            cannotUpdate.push(result[i]);
            allStudentsExist = false;
          }

          let gradeQuery: object;

          // Change query to search for student on basis of what is available out of CSID, SNUM, or CWL:
          // Got to do a join to add in missing required fields below from matching User object above
          try {
            if (typeof result[i].CSID !== 'undefined') { // CSID
              gradeQuery = {
                csid: String(result[i].CSID).toLowerCase(), 
                snum: user.snum,
                deliverable: deliv.name, 
                course: course.courseId
              };
            } else if (typeof result[i].SNUM !== 'undefined') { // SNUM
              gradeQuery = {
                snum: String(result[i].SNUM).toLowerCase(), 
                csid: user.csid,
                deliverable: deliv.name, 
                course: course.courseId
              };
            } else if (typeof result[i].CWL !== 'undefined') { // CWL
              gradeQuery = {
                csid: user.csid,
                snum: user.snum,
                deliverable: deliv.name, 
                course: course.courseId
              };
            }
            console.log(user);
              console.log('student coming by', user);
          } catch (err) {
            console.log('major err' + err);
          }

          if (studentExists) {
            let gradePromise = Grade.findOrCreate(gradeQuery)
              .then((grade: IGradeDocument) => {
                grade.grade = result[i].GRADE === "-1" || "" ? null : Number(result[i].GRADE);
                grade.comments = result[i].COMMENTS || '';
                grade.fname = user.fname;
                grade.lname = user.lname;
                grade.username = user.username;
                if (grade) {
                  updatedGrades.push(result[i]);
                }
                return grade.save();
              });
            gradePromises.push(gradePromise);
          } else {
            logger.info('GradeController:: INFO Student does not exist ', result[i]);
          }
        }

          return Promise.all(gradePromises)
          .then(() => {
            // Return updated grades to front-end
            for (let i = 0; i < updatedGrades.length; i++) {
              // Delete all extra columns before sending back successfully updated Grades that were updated.
              Object.keys(updatedGrades[i]).forEach((key) => {
                if (key !== "COMMENTS" && key !== "GRADE" && key !== 'CSID' && key !== 'SNUM' && key !== 'CWL') {
                  delete (updatedGrades[i] as any)[key];
                }
              });
              logger.info('GradeController:: SUCCESS Updated grades: ' + JSON.stringify({cannotUpdate, updatedGrades}));
            }
            return {cannotUpdate, updatedGrades};
          })
          .catch((err) => {
            logger.error('GradeController:: ERROR updating Grades: ' + err);
            return {cannotUpdate, updatedGrades};
          });

        });
    });
}

/**
 * Gets all grades for all the deliverables in a Course, even if they are not released.
 * 
 * @param payload.courseId string Course Id, such as '310'
 * @return IGradeDocument[] A list of released and non-released grades.
 */
function getAllGrades(payload: any) {
  return Grade.find({course: payload.courseId})
    .then((grades: IGradeDocument[]) => {
      if (grades) {
        return grades;
      }
      return [];
    });
}

/**
 * If a Deliverable 'gradesReleased' property is true, then this endpoint returns the 
 * grades that were requested for a particular Course and Deliverable to the student.
 * 
 * @param payload.courseId String name of the Course number ie. '310', '210'
 * @return IGradeDocument[] a list of grades under a Deliverable and Course
 */
function getGradesIfReleased(payload: any, snum: string, csid: string): Promise<IGradeDocument[]> {
  let course: ICourseDocument;
  let delivs: IDeliverableDocument[];
  let delivGradeQueries: any = [];
  let grades: IGradeDocument[] = [];
  
  const SNUM: string = snum;
  const CSID: string = csid;

  return Course.findOne({courseId: payload.courseId})
    .then((_course: ICourseDocument) => {
      if (_course) {
        course = _course;
        return course;
      }
      throw `Could not find the Course ${payload.courseId}`;
    })
    .then(() => {
      return Deliverable.find({courseId: course._id})
        .then((_delivs: IDeliverableDocument[]) => {
          if (_delivs) {
            delivs = _delivs;
            return delivs;
          }
          throw `Could not find Deliverables ${payload.delivName} under ${payload.courseId}`;
        });
    })
    .then(() => {
      if (typeof CSID === 'undefined' || typeof SNUM === 'undefined') {
        throw `CSID or SNUM cannot be found`;
      }
    })
    .then(() => {
      delivs.map((deliv) => {
        if (deliv.gradesReleased) {
          let delivGradeQuery = function () {
            return Grade.findOne({snum: SNUM, csid: CSID, deliverable: deliv.name, course: payload.courseId})
              .exec()
              .then((grade: IGradeDocument) => {
                if (grade) {
                  grades.push(grade);
                }
                return grade;
              });
          };
          delivGradeQueries.push(delivGradeQuery());
        }
      });
      return Promise.all(delivGradeQueries)
        .then(() => {
          // sort by deliverable name alphabetically and then return
          let sortedGrades: IGradeDocument[] = grades.sort(
            function(a, b) {
              return (a.deliverable < b.deliverable) ? -1 : (a.deliverable > b.deliverable) ? 1 : 0;
            }
          );
          return grades;
        });
    });
}

/**
 * Returns all of the Grades for a particular Deliverable and Course combination.
 * 
 * @param payload.delivName String name of the deliverable ie. 'd3', 'prt3'
 * @param payload.courseId String name of the Course number ie. '310', '210'
 * @return IGradeDocument[] a list of grades under a Deliverable and Course
 */
function getGradesByDeliv(payload: any): Promise<IGradeDocument[]> {
  return Grade.find({deliverable: payload.delivName, course: payload.courseId})
    .then((grades: IGradeDocument[]) => {
      return grades;
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

export {getAllGrades, addGradesCSV, getGradesByDeliv, getGradesIfReleased};
