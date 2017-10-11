import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import {ICourseDocument, Course} from '../models/course.model';
import {IUserDocument, User, CourseData} from '../models/user.model';
import {logger} from '../../utils/logger';
import * as request from '../helpers/request';
import {config} from '../../config/env';
import db, {Database} from '../db/MongoDBClient';
import mongodb = require('mongodb');

let context: Database = db;
let MongoClient = mongodb.MongoClient;

/**
 * Gets filename, if exists, from Result Record
 * @param string commit 7 char hash tag from github
 * @param string username of the result record
 * @param string filename that you would like to get with mime-type ie. 'stdio.txt'
 * @returns string format of file or null if file not found.
 */
function getFileFromResultRecord(payload: any): Promise<object[]> {

  const FILENAME = payload.filename;
  const RESULTS_COLLECTION = 'results';

  let query: any = {
    deliverable: payload.deliverable,
    commit: payload.commit,
    user: payload.username
  };
  return db.getLatestRecord(RESULTS_COLLECTION, query)
    .then((result: any) => {
      if (result) {
        return result;
      }
      throw `Could not find Result Record based on ${query.deliverable}, ${query.commit}, and ${query.user}.`;
    })
    .then((result: any) => {
      if (result.attachments) {
        for (let file of result.attachments) {
          if (typeof file.name === 'undefined') {
            throw `Cannot find filename ${FILENAME}`;
          }
          let filename: string = String(file.name);
          if (filename === FILENAME) {
            return file.data;
          }
        }
        throw `Could not matching filename of ${FILENAME}`;
      }
    });
}

export {
  getFileFromResultRecord
};
