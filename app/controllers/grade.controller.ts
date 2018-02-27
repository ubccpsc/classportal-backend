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
 *            - Grade will be empty string if left empty. Zeros must be explicitly assigned in grades column.
 *            - Comments will be empty if not included.
 * @param req.params.courseId CourseId string such as '310', '210'
 * @param req.params.delivName deliverable.name such as 'd1', 'd2'
 * @param req.files.gradesFile.path upload CSV location. (managed by Restify)
 * @return IGradeDocument[] list of updated grades under the delivName and courseId
 */
function addGradesCSV(req: any): Promise<any[]> {

  let course: ICourseDocument;
  let deliv: IDeliverableDocument;

  // CSV parser options
  const options = {
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
  };

  return Course.findOne({courseId: req.params.courseId})
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
      
      return csvParser(req.files.gradesFile.path, options).then((result: any) => {
        console.log('PARSING CSV GRADES', result);
        for (let i = 0; i < result.length; i++) {
          let gradePromise = Grade.findOrCreate({
            snum: result[i].SNUM, 
            csid: result[i].CSID, 
            deliverable: deliv.name, 
            course: course.courseId
          })
            .then((grade: IGradeDocument) => {
              grade.grade = result[i].GRADE === "-1" || "" ? null : Number(result[i].GRADE);
              grade.comments = result[i].COMMENTS;
              grade.save();
            });
            gradePromises.push(gradePromise);
          }
          return Promise.all(gradePromises)
            .then(() => {
              // Return updated grades to front-end
              return Grade.find({course: course.courseId, deliverable: req.params.delivName})
                .then((grades: IGradeDocument[]) => {
                  return grades;
                });
            });
        });
    });
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

export {getAllGradesByCourse, getReleasedGradesByCourse, addGradesCSV};
