import {logger} from '../../utils/logger';
import {config} from '../../config/env';
import db, {Database, InsertOneResponse} from '../db/MongoDBClient';
import mongodb = require('mongodb');


let fs = require('fs');

const RESULTS_COLLECTION = 'results';
const REQUESTS_COLLECTION = 'requests';

class DataExporter {

  private context: mongodb.Db;

  constructor() {
    // empty
  }

  public isFinished() {
    console.log('Done writing file output');
  }

  public exportTable(orgName: string, tableName: string, fName: string) {
    if (typeof orgName === 'undefined' || typeof tableName === 'undefined' || typeof fName === 'undefined') {
      console.error('DataExporter::exportTable(..) - all three params (orgName, tableName, fName) are required');
      return;
    }

    if (tableName === 'results') {

      let resultsOutputFile = 'results_' + orgName + '_dump.json';

      db.initDB().then((_db: mongodb.Db) => {
        return _db.collection('results').find({orgName})
          .toArray((err: Error, results: any[]) => {
            if (err) {
              console.log(err);              
              throw err;
            }
            fs.writeFileSync(resultsOutputFile, `{"${orgName + '":['}`);
            for (let i = 0; i < results.length; i++) {
              fs.appendFileSync(resultsOutputFile, JSON.stringify(results[i]));
              process.stdout.write(".");
              if (i !== (results.length - 1)) {
                fs.appendFileSync(resultsOutputFile, ",");
              }
            }
            fs.appendFileSync(resultsOutputFile, "]}");
            console.log('stringification worked');
            return;
          });
      });
    } else {
      console.error('DataExporter::exportTable(..) - ERROR: only exporting the "results" table is currently supported.');
    }
  }
}

const orgName = process.argv[2];
const tableName = process.argv[3];
const fName = process.argv[4];

console.log('DataExporter - starting; orgName: ' + orgName + '; tableName: ' + tableName + '; outputFileName: ' + fName);
const de = new DataExporter();
de.exportTable(orgName, tableName, fName);
console.log('DataExporter - complete.');
