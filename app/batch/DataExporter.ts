import {logger} from '../../utils/logger';
import {config} from '../../config/env';

let fs = require('fs');

class DataExporter {

  constructor() {
    // empty
  }

  public exportTable(orgName: string, tableName: string, fName: string) {
    if (typeof orgName === 'undefined' || typeof tableName === 'undefined' || typeof fName === 'undefined') {
      console.error('DataExporter::exportTable(..) - all three params (orgName, tableName, fName) are required');
      return;
    }

    if (tableName === 'results') {
      // TODO: impl here
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
