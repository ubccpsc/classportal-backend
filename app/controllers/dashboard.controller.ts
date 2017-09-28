import * as fs from 'fs';
import * as restify from 'restify';
import {logger} from '../../utils/logger';
import {config} from '../../config/env';
import * as request from '../helpers/request';

import {Db, MongoClient} from 'mongodb'; // .MongoClient;

/**
 * Gets dasboard rows.
 * @param {restify.Request}
 * @param {restify.Response}
 * @param {restify.Next}
 * @returns {string} the logged in username
 */
function getDashboard(req: any, res: any, next: any) {
  logger.info('dashboard.controller::getDashboard() - start');
  const resultRows: any[] = [];
  return Promise.resolve(res.json(200, resultRows))
    .catch((err) => {
      logger.info('Error loading dasboard: ' + err);
    });
}

function getRows(orgName: string, delivId: string) {
  const url = "mongodb://localhost:27017/test"; // HACK: should not be hard coded
  MongoClient.connect(url, function (err: any, db: any) {

    if (err) throw err;

    /*
        const query = {address: "Park Lane 38"};
        db.collection("customers").find(query).toArray(function (err, result) {
          if (err) throw err;
          console.log(result);
          db.close();
        });
        */

    // This code find the most recent run for each project in the org run against the given deliverable

// The first two variables are parameters that will be passed into this code

    const ORG = orgName; // 'CPSC210-2017W-T1'; //'CPSC210-2017W-T1'; // 'CPSC310-2017W-T2'
    const DELIV = delivId; // 'd0';

    let resultsArr: any[] = [];
    let results = db.getCollection('results').find({
      orgName:     ORG,
      deliverable: DELIV
    }).sort({
      timestamp: -1
    }).forEach(function (r: any) {
      resultsArr.push(r);
    });
// print (resultsArr);

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
// print(latestResultPerProjectArr)

    let returnRows = [];
// print(latestResultPerProjectArr)
    for (let rec of latestResultPerProjectArr) {
      let row: any = {};
      // print(rec)

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
        // print(rec);
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
        // missing: usuaully rec.report = REPORT_FAILED
        // just don't try to parse the detailed results
        // print(rec);
      } else {
        // prepare test reports
        for (let t of rec.report.tests.detailedResults) {
          if (t.state === 'pass') {
            passNames.push(t.testName);
          } else if (t.state === 'fail') {
            failNames.push(t.testName);
          } else if (t.state === 'skip') {
            skipNames.push(t.testName);
          }
        }
      }
      row.passNames = passNames;
      row.failNames = failNames;
      row.skipNames = skipNames;

      row.stdioURL = 'http://TODO_NEED_TO_IMPLEMENT';
      returnRows.push(row);
    }

    console.log('returnRows ready: ' + JSON.stringify(returnRows));
    return returnRows;
    // print(returnRows);

  });

}

export {getDashboard};
