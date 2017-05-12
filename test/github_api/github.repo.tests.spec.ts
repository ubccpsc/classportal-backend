import * as supertest from 'supertest';
import { expect } from 'chai';
import { app } from '../../server';
import { logger } from '../../utils/logger';
import { User, IUserDocument } from '../../app/models/user.model';
import { Team, ITeamDocument } from '../../app/models/team.model';
import * as mockData from '../assets/mockDataObjects';
import { studentCookie } from './../assets/auth.agents';

const TEST_ORG = 'ubccpsc-githubtest';
const TEST_REPO_DELIN = 'test';
const REAL_GITHUB_USER = 'thekitsch';

let agent = supertest.agent(app);
let faker = require('faker');


describe('GET /:courseId/admin/github/repos/:org', () => {

  before('Remove all repos created that begin with "test_"', (done) => {
    return agent
      .get('/710/admin/github/repos/' + TEST_ORG)
      .set('set-cookie', studentCookie)
      .end((err: any, res: supertest.Response) => {
        let repoResults = JSON.parse(res.text).response;
        let repoNames = new Array();
        for ( let key in repoResults) {
          if (repoResults[key].name.startsWith(TEST_REPO_DELIN)) {
            repoNames.push(repoResults[key].name);
          }
          console.log('repo names ' + repoNames);
        }
        if (err) {
          console.log(err);
        }
        return repoNames;
      })
      .then( (repoNames) => {
        let repoNamesReq = { 'repoNames': 'bla' };
        return agent
          .del('/710/admin/github/repos/' + TEST_ORG)
          .send(repoNamesReq)
          .end((err: any, res: supertest.Response) => {
            if (err) {
              done(err);
            } else {
              console.log('Successfully cleaned Organization of "Test_" Repos');
              done();
            }
          });
      });


  });

  it('api test: should create a team with team members', (done) => {
    agent
      .get('/710/admin/github/repos/' + TEST_ORG)
      .set('set-cookie', studentCookie)
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          // expect(res.text).to.equal(JSON.stringify('Something'));
          // expect(JSON.parse(res.text).response.to.equal(200));
          done();
        }
      });
  });

});