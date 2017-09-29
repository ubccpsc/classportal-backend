import * as restify from 'restify';
import {logger} from '../../utils/logger';
import {config} from '../../config/env';

import mongodb = require('mongodb');
let MongoClient = mongodb.MongoClient;

export class Dashboard {

  /**
   * Gets dasboard rows.
   * @param {restify.Request}
   * @param {restify.Response}
   * @param {restify.Next}
   * @returns {string} the logged in username
   */
  public getDashboard(req: any, res: any, next: any) {
    console.log('getDashboard() - config.db: ' + config.db);
    logger.info('dashboard.controller::getDashboard() - start');

    let orgName = req.params.orgName;
    let delivId = req.params.delivId;
    logger.info('dashboard.controller::getDashboard() - org:' + orgName + '; delivId: ' + delivId);

    const resultRows: any[] = [];
    // return Promise.resolve(res.json(200, resultRows))
    // return Promise.resolve(resultRows)
    return this.getRows(orgName, delivId).then(function (rows: any) {
      logger.info('getDashboard::then - rows: ' + rows);
      return Promise.resolve(rows);
    }).catch((err: Error) => {
      logger.info('Error loading dasboard: ' + err);
      return Promise.reject(err);
    });
  }

  public getRows(orgName: string, delivId: string): any { // HACK: should be a promise
    logger.info('dashboard.controller::getRows(...) - start; orgName: ' + orgName + '; delivId: ' + delivId);

    const url = config.db;
    // FOR LOCAL DEBUGGING:
    // const url = <PROD_DB_VALUE_FROM_ENV_FILE>
    return new Promise(function (resolve, reject) {
      MongoClient.connect(url).then(function (db) {
        logger.info(`MongoDB::getDB() Returning DB Connection: ${url}`);

        const ORG = orgName; // 'CPSC210-2017W-T1'; //'CPSC310-2017W-T1'; // 'CPSC310-2017W-T2'
        const DELIV = delivId; // 'd0';

        let resultsArr: any[] = [];
        let results = db.collection('results').find({
          orgName:     ORG,
          deliverable: DELIV
        }).sort({
          timestamp: -1
        }).toArray().then(function (res) {
          console.log('processing rows: ' + res.length);

          let resultsArr = res;

          let latestResultPerProject: any = {};
          let latestResultPerProjectArr: any[] = [];
          for (let p of resultsArr) {
            let hit = false;
            let project = p.team;

            if (typeof latestResultPerProject[project] === 'undefined') {
              latestResultPerProject[project] = p;
              latestResultPerProjectArr.push(p);
            }
          }

          console.log('# teams: ' + latestResultPerProjectArr.length);
          let returnRows = [];
          for (let rec of latestResultPerProjectArr) {
            let row: any = {};
            // e.g., if the test container failed
            let missingTestDetails = typeof rec.report === 'undefined' ||
              typeof rec.report.tests === 'undefined' ||
              typeof rec.report.tests.detailedResults === 'undefined';

            let missingUserDetails = typeof rec.report === 'undefined' ||
              typeof rec.report.studentInfo === 'undefined' ||
              typeof rec.report.studentInfo.projectUrl === 'undefined';

            row.project = rec.team;
            row.user = rec.user;

            if (missingUserDetails === true) {
              row.url = row.idStamp; // HACK it would be better if there was a rec.url
              // TODO: make this more verbose (e.g., 5 min timeout? something else?)
              row.error = 'Something is not right with this execution, see stdio.txt';
            } else {
              let rawURL = rec.report.studentInfo.projectUrl;
              rawURL = rawURL.replace('<token>@', ''); // HACK; would be better if there was a rec.url
              rawURL = rawURL.replace('.git', ''); // HACK; would be better if there was a rec.url
              rawURL = rawURL + '/commit/' + rec.report.studentInfo.projectCommit;
              row.url = rawURL;
              row.error = ''; // exists, but is empty
            }

            row.timestamp = Number(Number(rec.timestamp).toFixed(0)); // get rid of '.0' if it exists

            if (missingTestDetails === true) {
              // probably row.error will be set to something useful too
              row.scoreOverall = -1;
              row.scoreTest = -1;
              row.scoreCover = -1;
            } else {
              // print(rec.report);
              console.log(rec.report);
              let scoreOverall = -1;
              let scoreTest = -1;
              let scoreCover = -1;

              scoreOverall = rec.report.tests.grade.finalGrade;
              if (typeof rec.report.tests.custom !== 'undefined') {
                if (typeof rec.report.tests.custom.testingGrade !== 'undefined') {
                  scoreTest = rec.report.tests.custom.testingGrade;
                }
                if (typeof rec.report.tests.custom.testingGrade !== 'undefined') {
                  scoreTest = rec.report.tests.custom.testingGrade;
                }
                if (typeof rec.report.tests.custom.coverageGrade !== 'undefined') {
                  scoreTest = rec.report.tests.custom.coverageGrade;
                }
              }

              row.scoreOverall = scoreOverall;
              row.scoreTest = scoreTest;
              row.scoreCover = scoreCover;
            }

            let passNames = [];
            let failNames = [];
            let skipNames = [];
            if (missingTestDetails === true) {
              // missing: usually rec.report = REPORT_FAILED
              // just don't try to parse the detailed results
              // print(rec);
            } else {
              // prepare test reports
              for (let t of rec.report.tests.detailedResults) {
                if (t.state === 'pass' || t.state === 'passed') {
                  passNames.push(t.testName);
                } else if (t.state === 'fail' || t.state === 'failed') {
                  failNames.push(t.testName);
                } else if (t.state === 'skip' || t.state === 'skipped') {
                  skipNames.push(t.testName);
                } else {
                  console.log('unknown test state: ' + t.state);
                }
              }
            }
            row.passNames = passNames;
            row.failNames = failNames;
            row.skipNames = skipNames;

            row.stdioURL = 'http://TODO_NEED_TO_IMPLEMENT';
            returnRows.push(row);
          }

          console.log('returnRows ready: ' + returnRows.length); // JSON.stringify(returnRows));

          resolve(returnRows);
        }).catch(function (err) {
          console.log('bar catch ' + err);
          reject(err);
        });


      });
    });
  }
}

/*
console.log('bottom of dashboard controller');
let dash = new Dashboard();
dash.getDashboard({params: {orgName: 'CPSC310-2017W-T1', delivId: 'd1'}}, null, null).then(function (results: any) {
  console.log('then: ' + results);
}).catch(function (err: Error) {
  console.log('catch: ' + err);
});
*/
