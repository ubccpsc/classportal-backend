import * as supertest from 'supertest';
import {expect} from 'chai';
import {app} from '../../server';
import {logger} from '../../utils/logger';
import {User, IUserDocument} from '../../app/models/user.model';
import {Team, ITeamDocument} from '../../app/models/team.model';
import * as mockData from '../assets/mockDataObjects';
import {studentCookie} from './../assets/auth.agents';


let agent = supertest.agent(app);
let faker = require('faker');

const TEST_ORG = 'ubccpsc-githubtest';
const TEST_REPO_DELIN = 'test_';
const SUCCESS_RESPONSE_CREATE = {'response': 'Successfully created repo with teams and members.'};
const NEW_TEST_REPO = {
  'orgName':     'ubccpsc-githubtest',
  'name':        'test_repo_name_instance_' + faker.random.number(9999),
  'members':     ['thekitsch'],
  'memberTeams': ['Member_team_1', 'Member_team_2'],
  'admins':      ['thekitsch'],
  'adminTeams':  ['push_team_1'],
  'importUrl':   'https://github.com/ubccpsc-githubtest/import_respository_example',
};
const REAL_GITHUB_USER = 'thekitsch';

describe('/:courseId/admin/github/repos/:org', () => {
  let testReposList: any;

  it('should get status 200 on GET list of TEST_ repos', done => {
    agent
      .get('/710/admin/github/repos/' + TEST_ORG)
      .set('set-cookie', studentCookie)
      .end((err: any, res: supertest.Response) => {
        if (err) {
          console.log(err);
        }
        testReposList = JSON.parse(res.text).response;
        expect(res.status).to.equal(200);
        done();
      });
  });

  it('should get success 200 on DELETE TEST_ repos', done => {
    // Remove TEST repos based on list above
    let reposToDelete = new Array();

    for (let key in testReposList) {
      reposToDelete.push(testReposList[key].name);
    }

    let repoNamesReq = {'repoNames': reposToDelete};
    return agent
      .del('/710/admin/github/repos/' + TEST_ORG)
      .set('set-cookie', studentCookie)
      .send(repoNamesReq)
      .end((err: any, res: supertest.Response) => {
        if (err) {
          console.log(err);
        }
        expect(res.status).to.equal(200);
        done();
      });
  });

  it('should not find any TEST_ repos', (done) => {
    let repoNames = new Array(0);
    agent
      .get('/710/admin/github/repos/' + TEST_ORG)
      .set('set-cookie', studentCookie)
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          let repoResults = JSON.parse(res.text).response;
          for (let key in repoResults) {
            if (repoResults[key].name.startsWith(TEST_REPO_DELIN)) {
              console.log('found test repo' + repoResults[key].name);
              repoNames.push(repoResults[key].name);
            }
          }
          expect(repoNames.length).to.be.below(1);
          done();
        }
      });
  });

  // describe('PUT /:courseId/admin/github/repo/', () => {
  it('should create TEST_ repos', (done) => {

    agent
      .put('/710/admin/github/repo')
      .set('set-cookie', studentCookie)
      .send(NEW_TEST_REPO)
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.text).to.equal(JSON.stringify(SUCCESS_RESPONSE_CREATE));
          done();
        }
      });
  });
  // });


  // describe('GET /:courseId/admin/github/repos/:orgName', () => {
  it('should get TEST_ repos', (done) => {
    let repoNames = new Array();
    agent
      .get('/710/admin/github/repos/' + TEST_ORG)
      .set('set-cookie', studentCookie)
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          let repoResults = JSON.parse(res.text).response;
          for (let key in repoResults) {
            if (repoResults[key].name.startsWith(TEST_REPO_DELIN)) {
              repoNames.push(repoResults[key].name);
            }
          }
          expect(repoNames.length).to.equal(1);
          done();
        }
      });
  });
// });

});
