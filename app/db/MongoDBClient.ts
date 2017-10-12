/**
 * Created by steca
 */

import {logger} from '../../utils/logger';
import {config} from '../../config/env';
import mongodb = require('mongodb');

let MongoClient = mongodb.MongoClient;

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
  public async initDB() {
    
    const OPTIONS = {autoReconnect: true};
    const DEBUG_TOGGLE: string = 'debug';

    let that = this;

    return new Promise<mongodb.Db>(function (fulfill, reject) {
      try {
        MongoClient.connect(config.db, OPTIONS, function(err, db) {
          if (err) {
            throw err;
          }
          logger.info(`MongoDB::getDB() Returning DB Connection: ${config.db}`);
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
   * Gets all unique strings in a row (ie. all Deliverable names "d1", "d2", etc.)
   * @param _collectionName: string Table column ie. 'results'
   * @param _query: string Query to match against
   * @param _propertyName: string Property to pull unique entries from. 
   */
  public async getUniqueStringsInRow(_collectionName: string, _query: object, _propertyName: string):
    Promise<string[]> {
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
   * Gets latest record for each match
   */
  public async getResultRecordsHighestGrade(_collectionName: string, _timestamp: number, _query: any): Promise<any[]> {
    return new Promise<any[]>((fulfill, reject) => {
      // fix for 210, as customLogic property slightly off in grade result parser
      let groupQuery310 = {
        _id: "$user",
        username: {"$last": "$user"},
        deliverable: {"$last": "$deliverable"},
        studentInfo: {"$last": "$report.studentInfo"},
        submitted: {'$last': "$timestamp"},
        grade: {'$last': "$report.tests.grade"},
        customLogic: {'$last': "$report.custom"}
      };
      let groupQuery210 = {
        _id: "$user",
        username: {"$last": "$user"},
        deliverable: {"$last": "$deliverable"},        
        studentInfo: {"$last": "$report.studentInfo"},
        submitted: {'$last': "$timestamp"},
        grade: {'$last': "$report.tests.grade"},
        customLogic: {'$last': "$report.tests.custom"}
      };

      try {
        this.conn.then((db: mongodb.Db) => {
          return db.collection(_collectionName)
            .aggregate([
              {$match: _query},
              {$sort: {timestamp: 1}},
              {$group: "CPSC210-2017W-T1".indexOf(_query.orgName) > -1 ? groupQuery210 : groupQuery310}
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
        _id: "$user",
        username: {"$last": "$user"},
        deliverable: {"$last": "$deliverable"},
        studentInfo: {"$last": "$report.studentInfo"},
        submitted: {'$last': "$timestamp"},
        grade: {'$last': "$report.tests.grade"},
        customLogic: {'$last': "$report.custom"}
      };
      let groupQuery210 = {
        _id: "$user",
        username: {"$last": "$user"},
        deliverable: {"$last": "$deliverable"},
        studentInfo: {"$last": "$report.studentInfo"},
        submitted: {'$last': "$timestamp"},
        grade: {'$last': "$report.tests.grade"},
        customLogic: {'$last': "$report.tests.custom"}
      };

      try {
        this.conn.then((db: mongodb.Db) => {
          return db.collection(_collectionName)
            .aggregate([
              {$match: _query},
              {$sort: {timestamp: 1}},
              {$group: "CPSC210-2017W-T1".indexOf(_query.orgName) > -1 ? groupQuery210 : groupQuery310}
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
        query[field] = {"$in" : queries};

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
            if (err) { throw `InsertRecord() ERROR: ${err}`; }
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