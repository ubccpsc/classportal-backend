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
    let teamId = req.params.teamId;
    logger.info('dashboard.controller::getDashboard() - org:' + orgName + '; delivId: ' + delivId + '; teamId: ' + teamId);

    const resultRows: any[] = [];
    // return Promise.resolve(res.json(200, resultRows))
    // return Promise.resolve(resultRows)
    if (typeof teamId === 'undefined') {
      return this.getDeliverableRows(orgName, delivId).then(function (rows: any) {
        logger.info('getDashboard::then - rows: ' + rows);
        return Promise.resolve(rows);
      }).catch((err: Error) => {
        logger.info('Error loading dashboard: ' + err);
        return Promise.reject(err);
      });
    } else {
      return this.getTeamRows(orgName, delivId, teamId).then(function (rows: any) {
        logger.info('getDashboard::then - rows: ' + rows);
        return Promise.resolve(rows);
      }).catch((err: Error) => {
        logger.info('Error loading dasboard: ' + err);
        return Promise.reject(err);
      });
    }
  }

  private getTeamRows(orgName: string, delivId: string, teamId: string): any { // HACK: should be a promise
    return new Promise(function (resolve, reject) {
    });
  }

  private getDeliverableRows(orgName: string, delivId: string): any { // HACK: should be a promise
    logger.info('dashboard.controller::getRows(...) - start; orgName: ' + orgName + '; delivId: ' + delivId);

    const url = config.db;
    // FOR LOCAL DEBUGGING:
    // const url = <PROD_DB_VALUE_FROM_ENV_FILE>
    return new Promise(function (resolve, reject) {
      MongoClient.connect(url).then(function (db) {
        logger.info(`MongoDB::getDB() Returning DB Connection: ${url}`);

        const ORG = orgName; // 'CPSC210-2017W-T1'; //'CPSC310-2017W-T1'; // 'CPSC310-2017W-T2'
        const DELIV = delivId; // 'd0';

        const start = new Date().getTime();
        let resultsArr: any[] = [];

        let latestResultPerProjectArr: any[] = [];

        let rowRetriever = db.collection('results').find({
            orgName:     ORG,
            deliverable: DELIV
          },
          {

            _id:       true, // would like to replace this with a more github-specific id
            team:      true,
            timestamp: true
          }).sort({
          timestamp: -1
        }).toArray().then(function (res) {
          console.log('retrieving rows: ' + res.length);

          let resultsArr = res;

          let latestResultPerProject: any = {};

          for (let p of resultsArr) {
            let hit = false;
            let project = p.team;

            if (typeof latestResultPerProject[project] === 'undefined') {
              latestResultPerProject[project] = p;
              latestResultPerProjectArr.push(p._id);
            }
          }
          const took = (new Date().getTime() - start);
          console.log('retrieving ids; # teams: ' + latestResultPerProjectArr.length + "; took: " + took + ' ms');


          // 2 stage-search
          // report is large; only requesting the right rows can take us from ~100s -> 5s
          let results = db.collection('results').find({
              _id: {$in: latestResultPerProjectArr}
            },
            {
              _id:       true, // would like to replace this with a more github-specific id
              idStamp:   true,
              team:      true,
              report:    true,
              project:   true,
              user:      true,
              url:       true,
              commit:    true,
              timestamp: true

              // attachments: false
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
            const took = (new Date().getTime() - start);
            console.log('# teams: ' + latestResultPerProjectArr.length + "; took: " + took + ' ms');

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
              console.log('REC', rec);
              row.user = rec.user;
              row.commit = rec.commit;

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
                // console.log(rec.report);
                let scoreOverall = -1;
                let scoreTest = -1;
                let scoreCover = -1;

                scoreOverall = rec.report.tests.grade.finalGrade;

                // 210
                if (typeof rec.report.tests.custom !== 'undefined') {
                  if (typeof rec.report.tests.custom.testingGrade !== 'undefined') {
                    scoreTest = rec.report.tests.custom.testingGrade;
                  }
                  if (typeof rec.report.tests.custom.coverageGrade !== 'undefined') {
                    scoreCover = rec.report.tests.custom.coverageGrade;
                  }
                }

                // 310
                if (typeof rec.report.custom.testStats !== 'undefined') {
                  scoreTest = rec.report.custom.testStats.passPercent;
                }
                // 310
                if (typeof rec.report.coverage !== 'undefined' && typeof rec.report.coverage.lines !== 'undefined') {
                  scoreCover = rec.report.coverage.lines.percentage;
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
                    // too verbose
                    // console.log('unknown test state: ' + t.state);
                  }
                }
              }
              row.passNames = passNames;
              row.failNames = failNames;
              row.skipNames = skipNames;
              console.log(row);
              row.stdioURL = `${config.app_path}/admin/files/${DELIV}/${row.user}/${row.commit}/stdio.txt`;
              console.log('ROW STDIOURL', row.stdioURL);
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
    });
  }
}

/*
console.log('bottom of dashboard controller');
let dash = new Dashboard();
// const org = 'CPSC210-2017W-T1';
const org = 'CPSC310-2017W-T1';
const deliv = 'd1';
dash.getDashboard({params: {orgName: org, delivId: deliv}}, null, null).then(function (results: any) {
  console.log('then length: ' + results.length);
}).catch(function (err: Error) {
  console.log('catch: ' + err);
});
*/
