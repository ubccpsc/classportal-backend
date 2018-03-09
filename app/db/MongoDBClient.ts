/**
 * Created by steca
 */

import {logger} from '../../utils/logger';
import {config} from '../../config/env';
import mongodb = require('mongodb');
import {CoursePayload} from '../models/course.model';

let MongoClient = mongodb.MongoClient;
const RESULTS = 'results';
const DELIVERABLES = 'deliverables';
const COURSES = 'courses';

export class MongoDB {

  // must implement authentication before production release
  private username: string;
  private password: string;
  private conn: Promise<mongodb.Db>;

  constructor() {
    this.conn = this.initDB();
  }

  /**
   * Gets MongoDB connection
   */
  public async initDB(): Promise<mongodb.Db> {
    logger.info('MongoDB::initDB() - start');
    const OPTIONS = {autoReconnect: true};
    const DEBUG_TOGGLE: string = 'debug';

    let that = this;

    return new Promise<mongodb.Db>(function (fulfill, reject) {
      try {
        // logger.info('MongoDB::initDB() - db: ' + config.db + '; options: ' + OPTIONS);
        MongoClient.connect(config.db, OPTIONS, function (err, db) {
          if (err) {
            throw err;
          }
          logger.debug(`MongoDB::getDB() Returning DB Connection: ${config.db}`);
          fulfill(db);
        });
      }
      catch (err) {
        logger.error(`MongoDB::getDB() Problem returning DB Connection: ${err}`);
        reject(err);
      }
    });
  }

  /**
   * Queries a collection and returns a single matching result
   */
  public async getRecord(collectionName: string, query: object): Promise<any> {
    try {
      return this.conn.then((db: mongodb.Db) => {
        return db.collection(collectionName)
          .findOne(query)
          .then((result: JSON) => {
            if (!result) {
              throw `Could not find ${JSON.stringify(query)} under ${collectionName}. 
              This is NOT a true error if a push has never occurred on this repo.`;
            }
            else {
              return result;
            }
          });
      });
    }
    catch (err) {
      logger.error(`MongoDB::getRecord() Problem querying ${collectionName}: ${err}`);
    }
  }

  public async updateRecord(collectionName: string, query: object, newProperties: object): Promise<any> {
    return new Promise<any>((fulfill, reject) => {
      try {
        this.conn.then((db: mongodb.Db) => {
          db.collection(collectionName)
            .update(query, newProperties)
            .then((result: object) => {
              fulfill(result);
            });
        });
      } catch (err) {
        logger.error(`MongoDB::updateMany() Problem performing updateMany() in MongoDBClient.ts ` + err);
      }
    });
  }

  public async updateMany(collectionName: string, query: object, newProperties: object): Promise<any> {
    return new Promise<any>((fulfill, reject) => {
      try {
        this.conn.then((db: mongodb.Db) => {
          db.collection(collectionName)
            .updateMany(query, newProperties)
            .then((result: object) => {
              fulfill(result);
            });
        });
      } catch (err) {
        logger.error(`MongoDB::updateMany() Problem performing updateMany() in MongoDBClient.ts ` + err);
      }
    });
  }

  /**
   * Queries a collection and returns a single matching result
   */
  public async getLatestRecord(collectionName: string, query: object): Promise<any> {
    return new Promise<any>((fulfill, reject) => {
      try {
        this.conn.then((db: mongodb.Db) => {
          db.collection(collectionName)
            .findOne(query, {sort: {"$natural": -1}})
            .then((result: JSON) => {
              fulfill(result);
            });
        });
      }
      catch (err) {
        logger.error(`MongoDB::getRecord() Problem querying ${collectionName}: ${err}`);
        reject(err);
      }
    });
  }

  /** 
   * Resets all external Docker/Github task states from 'true', if in progress, to 'false'
   * @return Promise<boolean> true if update worked.
  */
  public async resetCourseStates(): Promise<boolean> {
    return new Promise<any>((fulfill, reject) => {
      try {
        this.conn.then((db: mongodb.Db) => {
          db.collection(COURSES)
            .updateMany({}, {$set: {buildingContainer: false}})
            .then((onfulfilled: mongodb.UpdateWriteOpResult) => {
                logger.info('MongoDB::resetCourseStates() Reset Course script activity states;');
              fulfill(onfulfilled);
            })
            .then((err) => {
              reject(err);
            });
        });
      }
      catch (err) {
        logger.error(`MongoDB::resetCourseStates() Problem  ${COURSES}: ${err}`);
        reject(err);
      }
    });
  }

  /** 
   * Resets all external Docker/Github task states from 'true', if in progress, to 'false'
   * @return Promise<boolean>;
  */
 public async resetDeliverableStates(): Promise<boolean> {
  return new Promise<any>((fulfill, reject) => {
    try {
      this.conn.then((db: mongodb.Db) => {
        db.collection(DELIVERABLES)
          .updateMany({}, {$set: {buildingContainer: false, buildingRepos: false}})
          .then((onfulfilled: mongodb.UpdateWriteOpResult) => {
            logger.info('MongoDB::resetDeliverableStates() Reset Deliverable script activity states;');
            fulfill(onfulfilled);
          })
          .then((err) => {
            reject(err);
          });
      });
    }
    catch (err) {
      logger.error(`MongoDB::resetDeliverableStates() Problem  ${COURSES}: ${err}`);
      reject(err);
    }
  });
}

  /**
   * Gets all unique strings in a row (ie. all Deliverable names "d1", "d2", etc.)
   * @param _collectionName: string Table column ie. 'results'
   * @param _query: string Query to match against
   * @param _propertyName: string Property to pull unique entries from.
   */
  public async getUniqueStringsInRow(_collectionName: string, _query: object, _propertyName: string): Promise<string[]> {
    return new Promise<string[]>((fulfill, reject) => {
      try {
        this.conn.then((db: mongodb.Db) => {
          return db.collection(_collectionName)
            .distinct(_propertyName, _query)
            .then((results: string[]) => {
              if (results) {
                return fulfill(results);
              }
            });
        });
      }
      catch (err) {
        logger.error(`Problem querying for distinct entries with ${_collectionName}, ${_query}, & ${_propertyName}`);
        reject(err);
      }
    });
  }

  /**
   * Gets all result records for query match
   */
  public async getAllResultRecords(_collectionName: string, _timestamp: number, _query: any): Promise<any[]> {
    return new Promise<any[]>((fulfill, reject) => {
      let projection310 = {
        _id:                             1,
        user:                            1,
        orgName:                         1,
        deliverable:                     1,
        team:                            1,
        reportFailed:                    1,
        report:                          1,
        gradeRequested:                  1,
        projectUrl:                      1,
        commitUrl:                       1,
        stdioRef:                        1,
        commit:                          1,
        timestamp:                       1,
        gradeRequestedTimestamp:         1,

        ref:                             1,
      };

      let projection210 = {
        _id:                             "$user",
        user:                            1,
        orgName:                         1,
        deliverable:                     1,
        team:                            1,
        reportFailed:                    1,
        report:                          1,
        gradeRequested:                  1,
        projectUrl:                      1,
        commitUrl:                       1,
        stdioRef:                        1,
        commit:                          1,
        timestamp:                       1,
        gradeRequestedTimestamp:         1,
        ref:                             1,
      };


      let projection: any = "CPSC210-2017W-T2".indexOf(_query.orgName) > -1 ? projection210 : projection310;

      try {
        this.conn.then((db: mongodb.Db) => {
          return db.collection(_collectionName)
            .find(_query, projection)
            .toArray((err: Error, results: any[]) => {
              if (err) {
                throw err;
              }
              fulfill(results);
            });
        });
      }
      catch (err) {
        logger.error(`MongoDBClient::getLatestRecords() ${err}`);
      }
    });
  }

  /**
   * Gets latest record for each match
   */
  public async getHighestResultRecords(_collectionName: string, _timestamp: number, _query: any): Promise<any[]> {
    return new Promise<any[]>((fulfill, reject) => {
      // fix for 210, as customLogic property slightly off in grade result parser
      let groupQuery310 = {
        _id:         "$user",
        username:    {$last: "$user"},
        delivId:     {$last: "$deliverable"},
        projectName: {$last: "$team"},
        gradeValue:  {$max: "$report.tests.grade.finalGrade"},
        projectUrl:  {"$last": "$report.studentInfo.projectUrl"},
        commit:      {"$last": "$commit"},
        submitted:   {$last: "$timestamp"},
        // grade: {$max: "$report.tests.grade"},
        // studentInfo: {$first: "$report.studentInfo"},
        // customLogic: {$first: "$report.tests"}
      };

      let groupQuery210 = {
        _id:         "$user",
        username:    {$last: "$user"},
        delivId:     {$last: "$deliverable"},
        projectName: {$last: "$team"},
        gradeValue:  {$max: "$report.tests.grade.finalGrade"},
        projectUrl:  {"$last": "$report.studentInfo.projectUrl"},
        commit:      {"$last": "$commit"},
        submitted:   {$last: "$timestamp"},
        // grade: {$max: "$report.tests.grade"},
        // studentInfo: {$first: "$report.studentInfo"},
        // customLogic: {$first: "$report.tests.custom"}
      };

      let groupQuery: any = "CPSC210-2017W-T1".indexOf(_query.orgName) > -1 ? groupQuery210 : groupQuery310;
      // groupQuery[_query.deliverable + 'Max'] = {$max: "$report.tests.grade.finalGrade"};

      try {
        this.conn.then((db: mongodb.Db) => {
          return db.collection(_collectionName)
            .aggregate([
              {$match: _query},
              {$sort: {'report.tests.grade.finalGrade': 1}},
              {$group: groupQuery},
              {
                $project: {
                  username:    1,
                  delivId:     1,
                  projectName: 1,
                  gradeKey:    _query.deliverable + 'Max',
                  gradeValue:  1,
                  projectUrl:  1,
                  commitUrl:   1,
                  commit:      1,
                  submitted:   1,
                }
              },
            ]).toArray((err: Error, results: any[]) => {
              if (err) {
                throw err;
              }

              fulfill(results);
            });
        });
      }
      catch (err) {
        logger.error(`MongoDBClient::getLatestRecords() ${err}`);
      }
    });
  }

  /**
   * Gets latest record for each match
   */
  public async getLatestResultRecords(_collectionName: string, _timestamp: number, _query: any): Promise<any[]> {
    return new Promise<any[]>((fulfill, reject) => {
      // fix for 210, as customLogic property slightly off in grade result parser
      let groupQuery310 = {
        _id:         "$user",
        username:    {"$last": "$user"},
        delivId:     {"$last": "$deliverable"},
        projectName: {"$last": "$team"},
        gradeValue:  {'$last': "$report.tests.grade.finalGrade"},
        projectUrl:  {"$last": "$report.studentInfo.projectUrl"},
        commit:      {"$last": "$commit"},
        submitted:   {'$last': "$timestamp"},
        // studentInfo: {"$last": "$report.studentInfo"},
        // grade: {'$last': "$report.tests.grade"},
        // customLogic: {'$last': "$report.custom"}
      };
      let groupQuery210 = {
        _id:         "$user",
        username:    {"$last": "$user"},
        delivId:     {"$last": "$deliverable"},
        projectName: {"$last": "$team"},
        gradeValue:  {'$last': "$report.tests.grade.finalGrade"},
        projectUrl:  {"$last": "$report.studentInfo.projectUrl"},
        commit:      {"$last": "$commit"},
        submitted:   {'$last': "$timestamp"},
        // studentInfo: {"$last": "$report.studentInfo"},
        // grade: {'$last': "$report.tests.grade"},
        // customLogic: {'$last': "$report.tests.custom"}
      };

      let groupQuery: any = "CPSC210-2017W-T1".indexOf(_query.orgName) > -1 ? groupQuery210 : groupQuery310;
      // groupQuery[_query.deliverable + 'Last'] = {'$last': "$report.tests.grade.finalGrade"};

      try {
        this.conn.then((db: mongodb.Db) => {
          return db.collection(_collectionName)
            .aggregate([
              {$match: _query},
              {$sort: {timestamp: 1}},
              {$group: groupQuery},
              {
                $project: {
                  username:    1,
                  delivId:     1,
                  projectName: 1,
                  gradeKey:    _query.deliverable + 'Last',
                  gradeValue:  1,
                  projectUrl:  1,
                  commit:      1,
                  submitted:   1,
                }
              },
            ]).toArray((err: Error, results: any[]) => {
              if (err) {
                throw err;
              }
              fulfill(results);
            });
        });
      }
      catch (err) {
        logger.error(`MongoDBClient::getLatestRecords() ${err}`);
      }
    });
  }


  /**
   * Gets all matches of ObjectIds from MongoDB
   * @param collectionName - name of the collection, ie. 'courses'
   * @param query - object of potential match, ie. { program: 'space-exploration' }
   * @param field - The property that is being queried (ie. '_id' field)
   */

  public getObjectIds(collectionName: string, field: string, queries: any[]): Promise<any[]> {
    try {
      let query: any = {};
      query[field] = {"$in": queries};

      return new Promise<object[]>((fulfill, reject) => {
        this.conn.then(db => {
          db.collection(collectionName)
            .find(query)
            .toArray((err: Error, results: any[]) => {
              if (err) {
                throw `Could not find ${JSON.stringify(queries)} under ${collectionName}: ${err}.`;
              }
              fulfill(results);
            });
        });
      });
    }
    catch (err) {
      logger.error(`MongoDB::getRecord() Problem querying ${collectionName}: ${err}`);
    }
    return null;
  }

  /**
   * Queries a collection and returns an array of all subsequent query matches
   * @param collectionName - name of the collection, ie. 'courses'
   * @param query - object of potential match, ie. { program: 'space-exploration' }
   */
  public async getRecords(collectionName: string, query: object): Promise<any[]> {
    try {
      return new Promise<any[]>((fulfill, reject) => {
        this.conn.then((db: mongodb.Db) => {
          db.collection(collectionName)
            .find(query)
            .sort({_id: -1})
            .toArray((err: Error, result: any) => {
              if (err) {
                throw err;
              }
              fulfill(result);
            });
        });
      });
    }
    catch (err) {
      logger.error(`MongoDB::getRecords() Problem querying ${collectionName}: ${err}`);
    }
    return null;
  }

  /**
   *
   * @param collectionName - name of the collection, ie. 'courses', 'users'
   * @param query - object of potential match, ie. { program: 'space-exploration' }
   *
   * */
  public async getCollection(collectionName: string): Promise<any[]> {
    try {
      return new Promise<JSON[]>((fulfill, reject) => {
        this.conn.then((db: mongodb.Db) => {
          db.collection(collectionName)
            .find().toArray((err: Error, result: JSON[]) => {
            if (err) {
              throw err;
            }
            fulfill(result);
          });
        });
      });
    }
    catch (err) {
      logger.error(`MongoDB::getCollection() Problem querying ${collectionName}: ${err}`);
    }
    return null;
  }

  /**
   *
   * @param collectionName - name of the collection, ie. 'courses', 'users'
   * @param document - object that is being inserted into the database
   *
   */
  public async insertRecord(collectionName: string, document: any): Promise<InsertOneResponse> {
    try {
      return new Promise<InsertOneResponse>((fulfill, reject) => {
        this.conn.then((db: mongodb.Db) => {
          db.collection(collectionName).insertOne(document, (err, result) => {
            if (err) {
              throw `InsertRecord() ERROR: ${err}`;
            }
            logger.info(`MongoDB::insertRecord() Successfully inserted document in ${collectionName}.`);
            fulfill(result);
          });
        });
      });
    }
    catch (err) {
      logger.error(`MongoDB::insertRecord() Problem inserting record: ${err}`);
    }
    return null;
  }

  /**
   *
   * @param collectionName - name of the collection, ie. 'courses', 'users'
   * @param document - object that is being inserted into the database
   *
   */
  public async getDeliverableStats(deliverable: string, orgName: string): Promise<object> {
    console.log('deliverable', deliverable);
    console.log('orgName', orgName);
    try {
      return new Promise<object>((fulfill, reject) => {
        this.conn.then((db: mongodb.Db) => {
          db.collection(RESULTS).aggregate([
            {$match: {orgName: orgName, deliverable: deliverable}},
            {$project: {_id: 1, orgName: 1, deliverable: 1, commit: 1}}
          ], (err, result) => {
            if (err) {
              throw `InsertRecord() ERROR: ${err}`;
            }
            logger.info(`MongoDB::getDeliverableStats() Successfully retrieved group count for deliverable in ${orgName}.`);
            fulfill(result);
          });
        });
      });
    }
    catch (err) {
      logger.error(`MongoDB::getDeliverableStats() Problem retrieving group count on ${orgName}: ${err}`);
    }
    return null;
  }
}

export interface MongoServer {

}

// http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#~insertOneWriteOpResult
export interface InsertOneResponse extends mongodb.InsertOneWriteOpResult {

}

// extends MongoDB class instance
export class Database extends MongoDB {
  constructor() {
    super();
  }
}

let db = new Database();

export default db;
