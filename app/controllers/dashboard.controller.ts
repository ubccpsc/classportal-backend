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
    let teamId = req.query.teamId;
    let tsMax = req.query.tsMax;

    if (typeof teamId === 'undefined') {
      teamId = null;
    }

    if (typeof tsMax === 'undefined') {
      tsMax = 9999999999999; // year 2286
    }
    logger.info('dashboard.controller::getDashboard() - org:' + orgName + '; delivId: ' + delivId + '; teamId: ' + teamId);

    const resultRows: any[] = [];
    // return Promise.resolve(res.json(200, resultRows))
    // return Promise.resolve(resultRows)
    if (teamId === null) {
      return this.getDeliverableRows(orgName, delivId, tsMax).then(function (rows: any) {
        // logger.info('getDashboard::then - rows: ' + rows);
        return Promise.resolve(rows);
      }).catch((err: Error) => {
        logger.info('Error loading dashboard: ' + err);
        return Promise.reject(err);
      });
    } else {
      return this.getTeamRows(orgName, delivId, teamId, tsMax).then(function (rows: any) {
        // logger.info('getDashboard::then - rows: ' + rows);
        return Promise.resolve(rows);
      }).catch((err: Error) => {
        logger.info('Error loading dasboard: ' + err);
        return Promise.reject(err);
      });
    }
  }

  private getTeamRows(orgName: string, delivId: string, teamId: string, tsMax: number): any { // HACK: should be a promise
    logger.info('dashboard.controller::getDeliverableRows(..) - start; orgName: ' + orgName + '; delivId: ' + delivId);
    let that = this;

    const url = config.db;
    // FOR LOCAL DEBUGGING:
    // const url = <PROD_DB_VALUE_FROM_ENV_FILE>
    return new Promise(function (resolve, reject) {
      MongoClient.connect(url).then(function (db) {
        logger.info(`dashboard.controller::getTeamRows(..) - Returning DB Connection: ${url}`);

        // const ORG = orgName; // 'CPSC210-2017W-T1'; //'CPSC310-2017W-T1'; // 'CPSC310-2017W-T2'
        // const DELIV = delivId; // 'd0';

        const start = new Date().getTime();
        let resultsArr: any[] = [];
        let teamArr: any[] = [];
        let rowRetriever = db.collection('results').find({
            orgName:     orgName,
            deliverable: delivId
          },
          {
            _id:       true, // would like to replace this with a more github-specific id
            team:      true,
            timestamp: true
          }).sort({
          timestamp: -1
        }).toArray().then(function (res) {
          console.log('dashboard.controller::getTeamRows(..) - retrieving rows: ' + res.length);

          let resultsArr = res;
          let latestResultPerProject: any = {};
          for (let p of resultsArr) {
            let hit = false;
            let project = p.team;

            if (p.timestamp <= tsMax) { // within time limit
              if (p.team === teamId) {
                teamArr.push(p._id);
              }
            }
          }
          const took = (new Date().getTime() - start);
          console.log('dashboard.controller::getTeamRows(..) - retrieving ids; # teams: ' +
            teamArr.length + '; first search took: ' + took + ' ms');

          // 2 stage-search
          // report is large; only requesting the right rows can take us from ~100s -> 5s
          db.collection('results').find({
              _id: {$in: teamArr}
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
            const took = (new Date().getTime() - start);
            console.log('dashboard.controller::getTeamRows(..) - retrieving data; # teams: ' + res.length +
              '; second search took: ' + took + ' ms');

            /*
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
            */
            // process records for dashboard
            let returnRows = that.populateRecords(res, delivId);

            resolve(returnRows);
          }).catch(function (err) {
            console.log('bar catch ' + err);
            reject(err);
          });
        });
      });
    });
  }

  private getDeliverableRows(orgName: string, delivId: string, tsMax: number): Promise<{}> {
    logger.info('dashboard.controller::getDeliverableRows(..) - start; orgName: ' + orgName + '; delivId: ' + delivId);
    let that = this;

    const url = config.db;
    // FOR LOCAL DEBUGGING:
    // const url = <PROD_DB_VALUE_FROM_ENV_FILE>
    return new Promise(function (resolve, reject) {
      MongoClient.connect(url).then(function (db) {
        logger.info(`dashboard.controller::getDeliverableRows(..) - Returning DB Connection: ${url}`);

        // const ORG = orgName; // 'CPSC210-2017W-T1'; //'CPSC310-2017W-T1'; // 'CPSC310-2017W-T2'
        // const DELIV = delivId; // 'd0';

        const start = new Date().getTime();
        let resultsArr: any[] = [];
        let latestResultPerProjectArr: any[] = [];
        let rowRetriever = db.collection('results').find({
            orgName:     orgName,
            deliverable: delivId
          },
          {
            _id:       true, // would like to replace this with a more github-specific id
            team:      true,
            timestamp: true
          }).sort({
          timestamp: -1
        }).toArray().then(function (res) {
          console.log('dashboard.controller::getDeliverableRows(..) - retrieving rows: ' + res.length);

          let resultsArr = res;
          let latestResultPerProject: any = {};
          for (let p of resultsArr) {
            let hit = false;
            let project = p.team;

            if (p.timestamp <= tsMax) { // within time limit
              if (typeof latestResultPerProject[project] === 'undefined') {
                latestResultPerProject[project] = p;
                latestResultPerProjectArr.push(p._id);
              }
            }
          }
          const took = (new Date().getTime() - start);
          console.log('dashboard.controller::getDeliverableRows(..) - retrieving ids; # teams: ' +
            latestResultPerProjectArr.length + '; first search took: ' + took + ' ms');

          // 2 stage-search
          // report is large; only requesting the right rows can take us from ~100s -> 5s
          db.collection('results').find({
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
            const took = (new Date().getTime() - start);
            console.log('dashboard.controller::getDeliverableRows(..) - retrieving data; # teams: ' + res.length +
              '; second search took: ' + took + ' ms');

            /*
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
            */

            // process records for dashboard
            let returnRows = that.populateRecords(res, delivId); // latestResultPerProjectArr

            resolve(returnRows);
          }).catch(function (err) {
            console.log('bar catch ' + err);
            reject(err);
          });
        });
      });
    });
  }

  private populateRecords(records: any, delivId: string) {

    let returnRows = [];
    for (let rec of records) {
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
      row.commit = rec.commit;

      row.url = 'UNKNOWN_REPORT_FAILED'; // TODO: make sure the commit URL always gets in there

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
        if (typeof rec.report.custom !== 'undefined') {
          if (typeof rec.report.custom.testStats !== 'undefined') {
            scoreTest = rec.report.custom.testStats.passPercent;
          }
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
          } else if (t.state === 'fail' || t.state === 'failed' || t.state === 'failure') {
            failNames.push(t.testName);
          } else if (t.state === 'skip' || t.state === 'skipped') {
            skipNames.push(t.testName);
          } else if (t.state === 'error' || t.state === 'errored') {
            failNames.push(t.testName);
          } else {
            // too verbose
            logger.debug('unknown test state: ' + t.state);
          }
        }
      }
      row.passNames = passNames;
      row.failNames = failNames;
      row.skipNames = skipNames;
      row.stdioURL = `${config.app_path}:${config.port}/admin/files/${delivId}/${row.user}/${row.commit}/stdio.txt`;
      returnRows.push(row);
    }

    // TODO: add more detail here to this result object
    console.log('dashboard.controller::getDeliverableRows(..) - returnRows ready: ' + returnRows.length);
    return returnRows;
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
